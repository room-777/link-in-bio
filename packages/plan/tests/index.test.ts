import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	blocksNewCheckout,
	canScheduleCancellation,
	getPlanAccess,
	isCancellationScheduled,
	isPeriodEnded,
	parseSubscriptionStatus,
} from "../src/index";

const now = new Date("2026-10-14T00:00:00.000Z");
const later = new Date("2026-11-14T00:00:00.000Z");

describe("plan decisions", () => {
	it("PLAN-001 rejects statuses outside Creem's type", () => {
		assert.equal(parseSubscriptionStatus("past_due"), "past_due");
		assert.throws(() => parseSubscriptionStatus("paid"), /Unknown/);
		assert.throws(() => parseSubscriptionStatus("toString"), /Unknown/);
	});

	it("PLAN-002 period ended uses one rule with or without periodEnd", () => {
		assert.equal(
			isPeriodEnded({ status: "active", periodEnd: now }, now),
			true,
		);
		assert.equal(
			isPeriodEnded({ status: "canceled", periodEnd: later }, now),
			false,
		);
		assert.equal(
			isPeriodEnded({ status: "scheduled_cancel", periodEnd: null }, now),
			true,
		);
		assert.equal(
			isPeriodEnded({ status: "active", periodEnd: null }, now),
			false,
		);
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

	it("PLAN-004 duplicate checkout is blocked by unpaid but Pro is not granted", () => {
		const unpaid = {
			status: "unpaid" as const,
			periodEnd: later,
			creemSubscriptionId: "s",
		};
		assert.equal(blocksNewCheckout(unpaid, now), true);
		assert.equal(
			getPlanAccess(
				[{ ...unpaid, productId: "pro", cancelAtPeriodEnd: false }],
				["pro"],
				now,
			).hasAccess,
			false,
		);
		assert.equal(
			blocksNewCheckout(
				{ ...unpaid, status: "active", creemSubscriptionId: null },
				now,
			),
			false,
		);
	});

	it("PLAN-005 access exposes page limit and lifecycle facts", () => {
		const plan = getPlanAccess(
			[
				{
					productId: "pro",
					status: "scheduled_cancel",
					periodEnd: later,
					cancelAtPeriodEnd: true,
				},
			],
			["pro"],
			now,
		);
		assert.equal(plan.pageLimit, 3);
		assert.equal(plan.cancellationScheduled, true);
		assert.equal(plan.periodEnded, false);
		assert.equal(plan.lapsedFromPro, false);
	});
});
