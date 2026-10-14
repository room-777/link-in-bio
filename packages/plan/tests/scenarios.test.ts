import assert from "node:assert/strict";
import { describe, it, type TestContext } from "node:test";
import {
	blocksNewCheckout,
	canResumeCancellation,
	getPlanAccess,
	graceEndsAt,
	needsCancelOnAccountDeletion,
	PAGE_GRACE_PERIOD_MS,
	refundRevokesAccess,
	type SubscriptionStatus,
} from "../src/index";

/**
 * Scenario matrix S-PLAN-*: every status x paid-until (past/future/missing)
 * x "cancel at period end" flag. The expected columns below are the policy
 * in /workspace/billing-spec/grabbin-policy.md, written out by hand so the
 * test does not reuse the code it checks.
 */
const now = new Date("2026-10-14T00:00:00.000Z");
const past = new Date("2026-10-13T00:00:00.000Z");
const future = new Date("2026-11-14T00:00:00.000Z");
const periods = { past, future, missing: null } as const;
type Period = keyof typeof periods;
type Status = SubscriptionStatus | null | "bogus";

// [pro, blocksCheckout, resumable(flag=false), resumable(flag=true), warns]
type Row = Record<Period, [boolean, boolean, boolean, boolean, boolean]>;
const policy: Record<string, Row> = {
	active: {
		past: [false, false, false, false, false],
		future: [true, true, false, true, false],
		missing: [true, true, false, false, true],
	},
	trialing: {
		past: [false, false, false, false, false],
		future: [true, true, false, true, false],
		missing: [true, true, false, false, true],
	},
	scheduled_cancel: {
		past: [false, false, false, false, false],
		future: [true, true, true, true, false],
		missing: [false, true, false, false, true],
	},
	past_due: {
		past: [false, false, false, false, false],
		future: [true, true, false, false, false],
		missing: [false, true, false, false, true],
	},
	unpaid: {
		past: [false, false, false, false, false],
		future: [true, true, false, false, false],
		missing: [false, true, false, false, true],
	},
	paused: {
		past: [false, false, false, false, false],
		future: [true, true, false, false, false],
		missing: [false, false, false, false, true],
	},
	canceled: {
		past: [false, false, false, false, false],
		future: [true, true, false, false, false],
		missing: [false, false, false, false, false],
	},
	expired: {
		past: [false, false, false, false, false],
		future: [false, false, false, false, false],
		missing: [false, false, false, false, false],
	},
	null: {
		past: [false, false, false, false, false],
		future: [false, false, false, false, false],
		missing: [false, false, false, false, false],
	},
	bogus: {
		past: [false, false, false, false, true],
		future: [false, false, false, false, true],
		missing: [false, false, false, false, true],
	},
};

function silence<T>(t: TestContext, run: () => T) {
	const warn = t.mock.method(console, "warn", () => {});
	const value = run();
	return { value, warned: warn.mock.callCount() > 0 };
}

let n = 0;
describe("plan scenario matrix", () => {
	for (const [statusKey, row] of Object.entries(policy)) {
		const status = (statusKey === "null" ? null : statusKey) as Status;
		for (const period of Object.keys(periods) as Period[]) {
			for (const flag of [false, true]) {
				n += 1;
				const id = `S-PLAN-${String(n).padStart(3, "0")}`;
				const [pro, blocks, resumeNoFlag, resumeFlag, warns] = row[period];
				it(`${id} ${statusKey} / ${period} / cancelFlag=${flag}`, (t) => {
					const sub = {
						subscriptionId: "sub_test",
						productId: "pro",
						status: status as SubscriptionStatus | null,
						periodEnd: periods[period],
						cancelAtPeriodEnd: flag,
					};
					const { value: plan, warned } = silence(t, () =>
						getPlanAccess([sub], ["pro"], now),
					);
					assert.equal(plan.hasAccess, pro, "Pro access");
					assert.equal(plan.tier, pro ? "pro" : "free");
					assert.equal(warned, warns, "warning logged");
					assert.equal(
						blocksNewCheckout({ ...sub, creemSubscriptionId: "sub_test" }, now),
						blocks,
						"blocks a second checkout",
					);
					assert.equal(
						canResumeCancellation(sub, now),
						flag ? resumeFlag : resumeNoFlag,
						"can undo cancel",
					);
				});
			}
		}
	}

	it("S-PLAN-061 open checkout (no Creem id) never blocks or grants", () => {
		const open = {
			status: null,
			periodEnd: null,
			creemSubscriptionId: null,
		};
		assert.equal(blocksNewCheckout(open, now), false);
		assert.equal(
			getPlanAccess(
				[{ productId: "pro", ...open, cancelAtPeriodEnd: false }],
				["pro"],
				now,
			).hasAccess,
			false,
		);
	});

	it("S-PLAN-062 other products never grant Pro", () => {
		const plan = getPlanAccess(
			[
				{
					productId: "other",
					status: "active",
					periodEnd: future,
					cancelAtPeriodEnd: false,
				},
			],
			["pro"],
			now,
		);
		assert.equal(plan.hasAccess, false);
	});

	it("S-PLAN-063 rejoin: the newest paid period decides access", () => {
		const plan = getPlanAccess(
			[
				{
					productId: "pro",
					status: "canceled",
					periodEnd: past,
					cancelAtPeriodEnd: false,
				},
				{
					productId: "pro",
					status: "active",
					periodEnd: future,
					cancelAtPeriodEnd: false,
				},
			],
			["pro"],
			now,
		);
		assert.equal(plan.hasAccess, true);
	});

	it("S-PLAN-064 custom domain grace is 7 days after the paid period", () => {
		assert.equal(
			graceEndsAt(past, now).getTime(),
			past.getTime() + PAGE_GRACE_PERIOD_MS,
		);
		assert.equal(
			graceEndsAt(null, now).getTime(),
			now.getTime() + PAGE_GRACE_PERIOD_MS,
		);
		assert.equal(graceEndsAt(null, now, future).getTime(), future.getTime());
	});

	it("S-PLAN-065 only a full refund ends access", () => {
		assert.equal(
			refundRevokesAccess({
				status: "succeeded",
				refundedAmount: 1000,
				amountPaid: 1000,
			}),
			true,
		);
		assert.equal(
			refundRevokesAccess({
				status: "succeeded",
				refundedAmount: 300,
				amountPaid: 1000,
			}),
			false,
		);
		assert.equal(refundRevokesAccess({ status: "succeeded" }), true);
		assert.equal(
			refundRevokesAccess({
				status: "pending",
				refundedAmount: 1000,
				amountPaid: 1000,
			}),
			false,
		);
	});

	it("S-PLAN-066 account deletion cancels everything Creem could still bill", () => {
		const billable: SubscriptionStatus[] = [
			"active",
			"trialing",
			"scheduled_cancel",
			"past_due",
			"unpaid",
			"paused",
		];
		for (const status of billable)
			assert.equal(needsCancelOnAccountDeletion({ status }), true, status);
		for (const status of ["canceled", "expired", null] as const)
			assert.equal(
				needsCancelOnAccountDeletion({ status }),
				false,
				String(status),
			);
	});

	it("S-PLAN-067 an unreadable paid-until date fails closed", (t) => {
		const { value } = silence(t, () =>
			getPlanAccess(
				[
					{
						productId: "pro",
						status: "active",
						periodEnd: new Date("nope"),
						cancelAtPeriodEnd: false,
					},
				],
				["pro"],
				now,
			),
		);
		assert.equal(value.hasAccess, false);
	});
});
