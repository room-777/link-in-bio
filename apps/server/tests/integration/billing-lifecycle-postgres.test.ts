/**
 * Webhook -> local Postgres -> access integration scenarios (S-INT-*).
 * Runs against a throwaway local database only. Set BILLING_TEST_DATABASE_URL
 * to e.g. postgres://postgres:postgres@127.0.0.1:54322/grabbin_billing_test.
 * Never point this at a shared or production database: it drops all tables.
 */
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
	after,
	before,
	beforeEach,
	describe,
	it,
	type TestContext,
} from "node:test";
import { getAccountPlan } from "@grabbin/application/billing";
import { reconcileExpiredSubscriptions } from "@grabbin/application/billing-reconciliation";
import { cancelSubscriptionsBeforeAccountDeletion } from "@grabbin/auth/account-deletion";
import {
	syncCreemCheckout,
	syncCreemDispute,
	syncCreemRefund,
	syncCreemWebhook,
} from "@grabbin/auth/creem-webhook";
import type { DatabaseClient } from "@grabbin/db";
import { drizzle, eq } from "@grabbin/db/drizzle";
import * as schema from "@grabbin/db/schema/index";
import { creemSubscription, pages, user } from "@grabbin/db/schema/index";
import { blocksNewCheckout, canResumeCancellation } from "@grabbin/plan";
import { Client } from "pg";
import { resumeProCancellation } from "../../src/services/billing.service";

const url = process.env.BILLING_TEST_DATABASE_URL;
const local =
	!!url && /@(127\.0\.0\.1|localhost):\d+\/grabbin_billing_test$/.test(url);
const PRO = "pro-monthly";
const env = {
	CREEM_API_KEY: "test-key-not-used",
	CREEM_TEST_MODE: "true",
	CREEM_PRO_MONTHLY_PRODUCT_ID: PRO,
	CREEM_PRO_YEARLY_PRODUCT_ID: "pro-yearly",
};
const day = 24 * 60 * 60 * 1000;
const t0 = new Date("2026-10-01T00:00:00.000Z");
const at = (days: number) => new Date(t0.getTime() + days * day);

let client: Client;
let db: DatabaseClient;
let clock = 0;

async function migrate(c: Client) {
	await c.query("drop schema if exists public cascade; create schema public;");
	await c.query("drop schema if exists drizzle cascade;");
	const dir = join(
		import.meta.dirname,
		"../../../../packages/db/src/migrations",
	);
	for (const file of readdirSync(dir)
		.filter((f) => f.endsWith(".sql"))
		.sort()) {
		for (const statement of readFileSync(join(dir, file), "utf8").split(
			"--> statement-breakpoint",
		))
			if (statement.trim()) await c.query(statement);
	}
}

function event(
	status: string,
	createdAt: Date,
	periodEnd: Date | null,
	extra: Record<string, unknown> = {},
) {
	clock += 1;
	return {
		webhookId: `evt_${clock}`,
		webhookCreatedAt: createdAt.getTime(),
		id: "sub_1",
		status,
		product: { id: PRO },
		customer: { id: "cust_1" },
		metadata: { referenceId: "user-1" },
		current_period_start_date: periodEnd
			? new Date(periodEnd.getTime() - 30 * day)
			: null,
		current_period_end_date: periodEnd,
		...extra,
	};
}

async function plan(now: Date) {
	return getAccountPlan({ db, userId: "user-1", proProductIds: [PRO], now });
}
async function row() {
	const found = await db.query.creemSubscription.findFirst({
		where: eq(creemSubscription.creemSubscriptionId, "sub_1"),
	});
	assert.ok(found, "subscription row");
	return found;
}
function quiet(t: TestContext) {
	return t.mock.method(console, "warn", () => {});
}

describe("billing lifecycle against local Postgres", { skip: !local }, () => {
	before(async () => {
		client = new Client({ connectionString: url });
		await client.connect();
		await migrate(client);
		db = drizzle({ client, schema }) as unknown as DatabaseClient;
	});
	after(async () => {
		await client?.end();
	});
	beforeEach(async () => {
		await db.delete(user);
		await db.insert(user).values({
			id: "user-1",
			name: "Test",
			email: "user-1@example.com",
		});
		await db
			.insert(pages)
			.values({ id: "page-1", userId: "user-1", handle: "main" });
		// Subscription already linked (checkout done), unless a test resets it.
		await db.insert(creemSubscription).values({
			id: "row-1",
			referenceId: "user-1",
			productId: PRO,
			status: "active",
			creemSubscriptionId: "sub_1",
			periodStart: t0,
			periodEnd: at(30),
		});
	});

	it("S-INT-001 첫 결제: 결제 완료 알림이 오면 Pro가 켜진다", async () => {
		await db.delete(creemSubscription);
		await db.insert(creemSubscription).values({
			id: "req-1",
			referenceId: "user-1",
			productId: PRO,
			status: null,
			checkoutId: "ch_1",
		});
		assert.equal((await plan(t0)).hasAccess, false, "결제 전");
		const result = await syncCreemCheckout(
			db,
			{ id: "ch_1", webhookId: "evt_ck", webhookCreatedAt: t0.getTime() },
			async () => ({
				id: "ch_1",
				status: "completed",
				requestId: "req-1",
				product: PRO,
				metadata: { referenceId: "user-1" },
				subscription: {
					id: "sub_1",
					status: "active",
					product: PRO,
					customer: "cust_1",
					currentPeriodStartDate: t0,
					currentPeriodEndDate: at(30),
				},
			}),
		);
		assert.equal(result?.accepted, true);
		assert.equal((await plan(at(1))).hasAccess, true);
		assert.equal(
			blocksNewCheckout(await row(), at(1)),
			true,
			"두 번 결제 막기",
		);
	});

	it("S-INT-002 매달 자동 결제 성공: 기간이 늘어나고 Pro 유지", async () => {
		await syncCreemWebhook(db, event("active", at(30), at(60)));
		assert.equal((await plan(at(45))).hasAccess, true);
		assert.equal((await row()).periodEnd?.toISOString(), at(60).toISOString());
	});

	it("S-INT-003 해지 신청: 남은 기간까지 Pro, 끝나면 Free", async () => {
		await syncCreemWebhook(db, event("scheduled_cancel", at(10), at(30)));
		assert.equal((await plan(at(20))).hasAccess, true);
		assert.equal(canResumeCancellation(await row(), at(20)), true);
		await syncCreemWebhook(db, event("canceled", at(30), at(30)));
		assert.equal((await plan(at(31))).hasAccess, false);
		assert.equal(canResumeCancellation(await row(), at(31)), false);
		assert.equal(
			blocksNewCheckout(await row(), at(31)),
			false,
			"다시 가입 가능",
		);
	});

	it("S-INT-004 해지 취소(되돌리기): 다시 정상 구독", async () => {
		await syncCreemWebhook(db, event("scheduled_cancel", at(10), at(30)));
		await syncCreemWebhook(db, event("active", at(12), at(30)));
		const r = await row();
		assert.equal(r.cancelAtPeriodEnd, false);
		assert.equal((await plan(at(20))).hasAccess, true);
	});

	it("S-INT-005 해지 후 기간이 끝나고 알림이 안 와도 날짜로 Free", async () => {
		await syncCreemWebhook(db, event("scheduled_cancel", at(10), at(30)));
		assert.equal((await plan(at(30))).hasAccess, false);
	});

	it("S-INT-006 카드 결제 실패: 이미 낸 기간까지만 Pro", async () => {
		await syncCreemWebhook(db, event("past_due", at(29), at(30)));
		assert.equal((await plan(at(29.5))).hasAccess, true);
		assert.equal((await plan(at(30))).hasAccess, false);
	});

	it("S-INT-007 결제 실패 후 재시도 성공: Pro 복구", async () => {
		await syncCreemWebhook(db, event("past_due", at(30), at(30)));
		assert.equal((await plan(at(31))).hasAccess, false);
		await syncCreemWebhook(db, event("active", at(32), at(62)));
		assert.equal((await plan(at(33))).hasAccess, true);
	});

	it("S-INT-008 재시도 모두 실패: 구독 종료", async () => {
		await syncCreemWebhook(db, event("unpaid", at(31), at(30)));
		await syncCreemWebhook(db, event("canceled", at(40), at(30)));
		assert.equal((await plan(at(41))).hasAccess, false);
		assert.equal(blocksNewCheckout(await row(), at(41)), false);
	});

	it("S-INT-009 일시정지: 낸 기간까지 Pro, 그 사이 새 결제는 막음", async () => {
		await syncCreemWebhook(db, event("paused", at(5), at(30)));
		assert.equal((await plan(at(10))).hasAccess, true);
		assert.equal(blocksNewCheckout(await row(), at(10)), true);
		assert.equal((await plan(at(31))).hasAccess, false);
	});

	it("S-INT-010 전액 환불: 즉시 Free", async () => {
		const r = await syncCreemRefund(db, {
			status: "succeeded",
			subscription: "sub_1",
			refund_amount: 1000,
			transaction: { amount_paid: 1000, refunded_amount: 1000 },
			webhookId: "evt_refund",
			webhookCreatedAt: at(5).getTime(),
		});
		assert.equal(r?.accepted, true);
		assert.equal((await plan(at(5))).hasAccess, false);
	});

	it("S-INT-011 일부 환불(보상): Pro 유지", async () => {
		const r = await syncCreemRefund(db, {
			status: "succeeded",
			subscription: "sub_1",
			refund_amount: 300,
			transaction: { amount_paid: 1000, refunded_amount: 300 },
			webhookId: "evt_partial",
			webhookCreatedAt: at(5).getTime(),
		});
		assert.equal(r, null);
		assert.equal((await plan(at(6))).hasAccess, true);
	});

	it("S-INT-012 카드사 결제 취소 요청(차지백): 즉시 Free", async () => {
		await syncCreemDispute(db, {
			subscription: { id: "sub_1" },
			webhookId: "evt_dispute",
			webhookCreatedAt: at(5).getTime(),
		});
		assert.equal((await plan(at(5))).hasAccess, false);
	});

	it("S-INT-013 알림 순서 뒤바뀜: 늦게 온 옛 알림은 무시", async () => {
		await syncCreemWebhook(db, event("canceled", at(30), at(30)));
		const old = await syncCreemWebhook(db, event("active", at(5), at(30)));
		assert.equal(old?.accepted, false);
		assert.equal((await row()).status, "canceled");
		const oldSchedule = await syncCreemWebhook(
			db,
			event("scheduled_cancel", at(10), at(30)),
		);
		assert.equal(oldSchedule?.accepted, false);
		assert.equal((await row()).status, "canceled");
	});

	it("S-INT-014 같은 알림 두 번: 결과는 한 번과 같다", async () => {
		const e = event("scheduled_cancel", at(10), at(30));
		await syncCreemWebhook(db, e);
		const first = await row();
		await syncCreemWebhook(db, e);
		const second = await row();
		assert.equal(second.status, first.status);
		assert.equal(
			second.periodEnd?.toISOString(),
			first.periodEnd?.toISOString(),
		);
		assert.equal(second.lastWebhookId, first.lastWebhookId);
	});

	it("S-INT-015 알림에 날짜가 빠짐: 저장된 날짜를 유지", async () => {
		await syncCreemWebhook(db, event("scheduled_cancel", at(10), null));
		assert.equal((await row()).periodEnd?.toISOString(), at(30).toISOString());
		assert.equal((await plan(at(20))).hasAccess, true);
	});

	it("S-INT-016 망가진 데이터(해지 예약인데 날짜 없음): Pro 없음 + 기록", async (t) => {
		const warn = quiet(t);
		await db
			.update(creemSubscription)
			.set({ status: "scheduled_cancel", periodEnd: null });
		assert.equal((await plan(at(1))).hasAccess, false);
		assert.ok(warn.mock.callCount() > 0);
		assert.deepEqual(warn.mock.calls[0]?.arguments[1], {
			subscriptionId: "sub_1",
		});
	});

	it("S-INT-017 모르는 상태 알림: 저장하지 않고 거절", async () => {
		await assert.rejects(syncCreemWebhook(db, event("weird", at(3), at(30))));
		assert.equal((await row()).status, "active");
	});

	it("S-INT-018 매일 점검: 갱신 알림을 놓쳐도 결제사 기준으로 복구", async () => {
		const skipped = await reconcileExpiredSubscriptions({
			db,
			env,
			now: at(31),
			fetchSubscription: (async () => ({
				status: "active",
				currentPeriodStartDate: at(30),
				currentPeriodEndDate: at(60),
			})) as never,
		});
		assert.equal(skipped.size, 0);
		assert.equal((await plan(at(31))).hasAccess, true);
	});

	it("S-INT-019 매일 점검: 결제사가 날짜를 안 주면 저장된 날짜 유지", async () => {
		await reconcileExpiredSubscriptions({
			db,
			env,
			now: at(31),
			fetchSubscription: (async () => ({ status: "canceled" })) as never,
		});
		const r = await row();
		assert.equal(r.status, "canceled");
		assert.equal(r.periodEnd?.toISOString(), at(30).toISOString());
	});

	it("S-INT-020 매일 점검: 결제사 연결 실패면 건너뛰고 다음에 재시도", async (t) => {
		quiet(t);
		const skipped = await reconcileExpiredSubscriptions({
			db,
			env,
			now: at(31),
			fetchSubscription: (async () => {
				throw new Error("down");
			}) as never,
		});
		assert.deepEqual([...skipped], ["user-1"]);
		assert.equal(
			(await plan(at(31))).hasAccess,
			false,
			"기간 지난 건 그대로 Free",
		);
	});

	it("S-INT-021 매일 점검: 기간이 남은 구독은 건드리지 않음", async () => {
		let called = false;
		await reconcileExpiredSubscriptions({
			db,
			env,
			now: at(10),
			fetchSubscription: (async () => {
				called = true;
				return { status: "canceled" };
			}) as never,
		});
		assert.equal(called, false);
	});

	it("S-INT-022 다시 가입: 끝난 구독 뒤 새 구독이 Pro를 켠다", async () => {
		await syncCreemWebhook(db, event("canceled", at(30), at(30)));
		await db.insert(creemSubscription).values({
			id: "row-2",
			referenceId: "user-1",
			productId: PRO,
			status: "active",
			creemSubscriptionId: "sub_2",
			periodStart: at(40),
			periodEnd: at(70),
		});
		assert.equal((await plan(at(41))).hasAccess, true);
	});

	it("S-INT-023 구독이 끝나 Free가 돼도 내 페이지는 그대로 남는다", async () => {
		await syncCreemWebhook(db, event("canceled", at(30), at(30)));
		assert.equal((await plan(at(31))).hasAccess, false);
		const main = await db.query.pages.findFirst({
			where: eq(pages.id, "page-1"),
		});
		assert.ok(main, "페이지 유지");
	});

	it("S-INT-024 회원 탈퇴: 결제 중인 구독을 먼저 즉시 해지", async () => {
		const canceled: string[] = [];
		await cancelSubscriptionsBeforeAccountDeletion(
			db,
			"user-1",
			{ apiKey: "x", testMode: true },
			{
				subscriptions: {
					cancel: async (id) => {
						canceled.push(id);
						return { status: "canceled" };
					},
				},
			},
		);
		assert.deepEqual(canceled, ["sub_1"]);
	});

	it("S-INT-025 회원 탈퇴: 해지가 실패하면 탈퇴를 멈춘다", async (t) => {
		quiet(t);
		await assert.rejects(
			cancelSubscriptionsBeforeAccountDeletion(
				db,
				"user-1",
				{ apiKey: "x", testMode: true },
				{
					subscriptions: {
						cancel: async () => {
							throw new Error("creem down");
						},
					},
				},
			),
		);
	});

	it("S-INT-026 회원 탈퇴: 이미 끝난 구독은 해지 요청 안 함", async () => {
		await syncCreemWebhook(db, event("canceled", at(30), at(30)));
		let calls = 0;
		await cancelSubscriptionsBeforeAccountDeletion(
			db,
			"user-1",
			{ apiKey: "x", testMode: true },
			{
				subscriptions: {
					cancel: async () => {
						calls += 1;
						return { status: "canceled" };
					},
				},
			},
		);
		assert.equal(calls, 0);
	});

	it("S-INT-027 해지 되돌리기 버튼: 기간 안이면 결제사에 되돌리기 요청 후 정상 구독", async () => {
		await syncCreemWebhook(db, event("scheduled_cancel", at(10), at(30)));
		const calls: string[] = [];
		const ok = await resumeProCancellation({
			db,
			userId: "user-1",
			now: at(15),
			creem: {
				subscriptions: {
					resume: async (id: string) => {
						calls.push(id);
						return { status: "active", currentPeriodEndDate: at(30) };
					},
				},
			} as never,
		});
		assert.equal(ok, true);
		assert.deepEqual(calls, ["sub_1"]);
		const r = await row();
		assert.equal(r.status, "active");
		assert.equal(r.cancelAtPeriodEnd, false);
	});

	it("S-INT-028 해지 되돌리기 버튼: 기간이 끝났으면 거절(새로 가입해야 함)", async () => {
		await syncCreemWebhook(db, event("scheduled_cancel", at(10), at(30)));
		let called = false;
		const ok = await resumeProCancellation({
			db,
			userId: "user-1",
			now: at(31),
			creem: {
				subscriptions: {
					resume: async () => {
						called = true;
						return { status: "active" };
					},
				},
			} as never,
		});
		assert.equal(ok, false);
		assert.equal(called, false);
	});

	it("S-INT-029 해지 되돌리기: 결제사가 여전히 해지 예약이라 하면 실패로 처리", async () => {
		await syncCreemWebhook(db, event("scheduled_cancel", at(10), at(30)));
		await assert.rejects(
			resumeProCancellation({
				db,
				userId: "user-1",
				now: at(15),
				creem: {
					subscriptions: {
						resume: async () => ({ status: "scheduled_cancel" }),
					},
				} as never,
			}),
		);
		assert.equal((await row()).status, "scheduled_cancel");
	});
});
