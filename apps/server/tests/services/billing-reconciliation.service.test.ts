import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { DatabaseClient } from "@grabbin/db";
import { reconcileExpiredSubscriptions } from "../../src/services/billing-reconciliation.service";

describe("billing reconciliation service", () => {
	/**
	 * Case ID: BILLING-RECONCILE-001
	 * Given: a Pro subscription row is past its period end but Creem reports it active with a new end date.
	 * When: the daily reconciliation runs.
	 * Then: the local row is refreshed and the user's page lifecycle is renewed.
	 * Evidence: Creem was queried with the stored ID and the refreshed status and period were saved.
	 * Result: Pass | Fail | Blocked | Not Run
	 */
	it("BILLING-RECONCILE-001 restores a renewal missed by webhooks", async () => {
		const periodEnd = new Date("2026-10-27T00:00:00.000Z");
		const writes: Record<string, unknown>[] = [];
		let requestedId = "";
		const update = {
			set(values: Record<string, unknown>) {
				writes.push(values);
				return update;
			},
			where: async () => undefined,
		};
		const tx = {
			execute: async () => undefined,
			query: {
				user: { findFirst: async () => ({ primaryPageHandle: "main" }) },
				creemSubscription: {
					findMany: async () => [
						{
							id: "row-1",
							referenceId: "user-1",
							productId: "pro-monthly",
							status: "active",
							periodEnd,
							cancelAtPeriodEnd: false,
						},
					],
				},
			},
			update: () => update,
		};
		const db = {
			query: {
				creemSubscription: {
					findMany: async () => [
						{
							id: "row-1",
							referenceId: "user-1",
							creemSubscriptionId: "sub-1",
							productId: "pro-monthly",
							lastWebhookId: "webhook-old",
						},
					],
				},
			},
			update: () => update,
			transaction: async (callback: (value: typeof tx) => unknown) =>
				callback(tx),
		} as unknown as DatabaseClient;

		const skipped = await reconcileExpiredSubscriptions({
			db,
			env: {
				CREEM_API_KEY: "test-key",
				CREEM_TEST_MODE: "true",
				CREEM_PRO_MONTHLY_PRODUCT_ID: "pro-monthly",
				CREEM_PRO_YEARLY_PRODUCT_ID: "pro-yearly",
			},
			now: new Date("2026-09-27T00:00:00.000Z"),
			fetchSubscription: async (_options, id) => {
				requestedId = id;
				return {
					status: "active",
					currentPeriodStartDate: new Date("2026-09-27T00:00:00.000Z"),
					currentPeriodEndDate: periodEnd,
				} as never;
			},
		});

		assert.equal(requestedId, "sub-1");
		assert.deepEqual(skipped, new Set());
		assert.equal(writes[0]?.status, "active");
		assert.equal(writes[0]?.periodEnd, periodEnd);
		assert.deepEqual(writes[1], { deletionScheduledAt: null });
	});

	/**
	 * Case ID: BILLING-RECONCILE-002
	 * Given: Creem cannot be reached while a page deletion is due.
	 * When: the daily reconciliation runs.
	 * Then: the account is marked to skip page deletion until Creem can be checked.
	 * Evidence: the returned skip set contains the account whose provider lookup failed.
	 * Result: Pass | Fail | Blocked | Not Run
	 */
	it("BILLING-RECONCILE-002 protects pages when the provider check fails", async () => {
		const db = {
			query: {
				creemSubscription: {
					findMany: async () => [
						{
							id: "row-1",
							referenceId: "user-1",
							creemSubscriptionId: "sub-1",
							productId: "pro-monthly",
							lastWebhookId: null,
						},
					],
				},
			},
		} as unknown as DatabaseClient;
		const skipped = await reconcileExpiredSubscriptions({
			db,
			env: {
				CREEM_API_KEY: "test-key",
				CREEM_TEST_MODE: "true",
				CREEM_PRO_MONTHLY_PRODUCT_ID: "pro-monthly",
				CREEM_PRO_YEARLY_PRODUCT_ID: "pro-yearly",
			},
			fetchSubscription: async () => {
				throw new Error("provider unavailable");
			},
		});

		assert.deepEqual(skipped, new Set(["user-1"]));
	});
});
