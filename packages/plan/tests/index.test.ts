import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	blocksNewCheckout,
	canScheduleCancellation,
	getPlanAccess,
	isCancellationScheduled,
	isPeriodEnded,
	parseSubscriptionStatus,
	type SubscriptionStatus,
} from "../src/index";

const now = new Date("2026-10-14T00:00:00.000Z");
const later = new Date("2026-11-14T00:00:00.000Z");

function access(status: SubscriptionStatus, periodEnd: Date | null) {
	return getPlanAccess(
		[{ productId: "pro", status, periodEnd, cancelAtPeriodEnd: false }],
		["pro"],
		now,
	);
}

describe("plan decisions", () => {
	it("PLAN-008 missing periodEnd logs only the subscription id", (t) => {
		const warn = t.mock.method(console, "warn", () => {});
		for (const status of [
			"scheduled_cancel",
			"past_due",
			"unpaid",
			"paused",
		] as const) {
			const plan = getPlanAccess(
				[
					{
						subscriptionId: "sub_123",
						productId: "pro",
						status,
						periodEnd: null,
						cancelAtPeriodEnd: true,
					},
				],
				["pro"],
				now,
			);
			assert.equal(plan.hasAccess, false, status);
		}
		assert.equal(warn.mock.callCount(), 4);
		for (const call of warn.mock.calls)
			assert.deepEqual(call.arguments[1], { subscriptionId: "sub_123" });
	});

	it("PLAN-001 rejects statuses outside Creem's type", () => {
		assert.equal(parseSubscriptionStatus("past_due"), "past_due");
		assert.throws(() => parseSubscriptionStatus("paid"), /Unknown/);
		assert.throws(() => parseSubscriptionStatus("toString"), /Unknown/);
	});

	it("PLAN-002 only canceled and expired end without a periodEnd", () => {
		const ended = (status: SubscriptionStatus, periodEnd: Date | null) =>
			isPeriodEnded({ status, periodEnd }, now);
		assert.equal(ended("active", now), true);
		assert.equal(ended("canceled", later), false);
		assert.equal(ended("canceled", null), true);
		assert.equal(ended("expired", null), true);
		assert.equal(ended("scheduled_cancel", null), false);
		assert.equal(ended("active", null), false);
	});

	it("PLAN-003 cancellation scheduled from flag or status", () => {
		assert.equal(
			isCancellationScheduled({ status: "active", cancelAtPeriodEnd: true }),
			true,
		);
		assert.equal(isCancellationScheduled({ status: "scheduled_cancel" }), true);
		assert.equal(isCancellationScheduled({ status: "active" }), false);
		assert.equal(canScheduleCancellation({ status: "past_due" }), false);
	});

	it("PLAN-004 duplicate checkout ignores rows without a Creem subscription", () => {
		const row = {
			status: "unpaid" as const,
			periodEnd: later,
			creemSubscriptionId: "s",
		};
		assert.equal(blocksNewCheckout(row, now), true);
		assert.equal(
			blocksNewCheckout(
				{ ...row, status: "active", creemSubscriptionId: null },
				now,
			),
			false,
		);
	});

	it("PLAN-005 pay, cancel mid-period, then period end", () => {
		const sub = (status: SubscriptionStatus, at: Date) =>
			getPlanAccess(
				[
					{
						productId: "pro",
						status,
						periodEnd: later,
						cancelAtPeriodEnd: status === "scheduled_cancel",
					},
				],
				["pro"],
				at,
			);
		assert.equal(sub("active", now).tier, "pro");
		assert.equal(sub("scheduled_cancel", now).tier, "pro");
		assert.equal(sub("canceled", now).tier, "pro");
		const afterEnd = new Date(later.getTime() + 1);
		assert.equal(sub("scheduled_cancel", afterEnd).tier, "free");
		assert.equal(sub("canceled", afterEnd).lapsedFromPro, true);
	});

	it("PLAN-006 payment failure or pause keeps Pro until the paid periodEnd", () => {
		for (const status of ["past_due", "unpaid", "paused"] as const) {
			assert.equal(access(status, later).hasAccess, true, `${status} before`);
			assert.equal(access(status, now).hasAccess, false, `${status} at end`);
			assert.equal(access(status, null).hasAccess, false, `${status} no end`);
		}
	});

	it("PLAN-007 scheduled_cancel without periodEnd is invalid: no Pro", () => {
		const plan = access("scheduled_cancel", null);
		assert.equal(plan.hasAccess, false);
		assert.equal(plan.lapsedFromPro, true);
		assert.equal(access("scheduled_cancel", later).hasAccess, true);
		assert.equal(access("canceled", null).hasAccess, false);
		assert.equal(access("expired", null).hasAccess, false);
	});
});
