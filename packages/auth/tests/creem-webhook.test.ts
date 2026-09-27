import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { DatabaseClient } from "@grabbin/db";
import {
	syncCreemCheckout,
	syncCreemRefund,
	syncCreemWebhook,
} from "../src/creem-webhook";

describe("Creem webhook synchronization", () => {
	/**
	 * Case ID: CREEM-WEBHOOK-001
	 * Given: a newer webhook snapshot is already stored for a subscription.
	 * When: Creem delivers an older event afterward.
	 * Then: the saved newer state is restored instead of being overwritten.
	 * Evidence: the persisted values keep the newer status and webhook ID, and accepted is false.
	 * Result: Pass | Fail | Blocked | Not Run
	 */
	it("CREEM-WEBHOOK-001 ignores an older event after a newer one", async () => {
		const latestState = {
			productId: "pro-monthly",
			status: "active",
			creemCustomerId: "customer-1",
			creemSubscriptionId: "subscription-1",
			creemOrderId: "order-1",
			periodStart: "2026-09-01T00:00:00.000Z",
			periodEnd: "2026-10-01T00:00:00.000Z",
			cancelAtPeriodEnd: false,
			lastWebhookId: "event-new",
			lastWebhookCreatedAt: "2026-09-20T00:00:00.000Z",
		};
		const saved: Record<string, unknown>[] = [];
		const update = {
			set(values: Record<string, unknown>) {
				saved.push(values);
				return update;
			},
			where: async () => undefined,
		};
		const tx = {
			execute: async () => undefined,
			delete: () => ({ where: async () => undefined }),
		};
		const db = {
			query: {
				creemSubscription: {
					findFirst: async () => ({
						id: "row-1",
						referenceId: "user-1",
						creemCustomerId: "customer-1",
						creemOrderId: "order-1",
						periodStart: new Date(latestState.periodStart),
						periodEnd: new Date(latestState.periodEnd),
						lastWebhookId: "event-new",
						lastWebhookCreatedAt: new Date(latestState.lastWebhookCreatedAt),
						lastWebhookState: latestState,
					}),
				},
			},
			update: () => update,
			transaction: async (callback: (value: typeof tx) => unknown) =>
				callback(tx),
		} as unknown as DatabaseClient;

		const result = await syncCreemWebhook(db, {
			webhookId: "event-old",
			webhookCreatedAt: new Date("2026-09-10T00:00:00.000Z").getTime(),
			id: "subscription-1",
			status: "canceled",
			product: { id: "pro-monthly" },
			metadata: { referenceId: "user-1" },
		});

		assert.equal(result?.accepted, false);
		assert.equal(saved[0]?.status, "active");
		assert.equal(saved[0]?.lastWebhookId, "event-new");
	});

	/**
	 * Case ID: CREEM-WEBHOOK-002
	 * Given: checkout.completed omits the subscription and the pending row has a stale product ID.
	 * When: checkout retrieval confirms its request, owner, and completed subscription.
	 * Then: the subscription and user customer ID are saved from the verified checkout.
	 * Evidence: persisted subscription status, checkout IDs, and customer ID.
	 * Result: Pass | Fail | Blocked | Not Run
	 */
	it("CREEM-WEBHOOK-002 retrieves a completed checkout when its webhook omits the subscription", async () => {
		const values: Record<string, unknown>[] = [];
		let queryCount = 0;
		const update = {
			set(next: Record<string, unknown>) {
				values.push(next);
				return update;
			},
			where: async () => undefined,
		};
		const tx = {
			execute: async () => undefined,
			delete: () => ({ where: async () => undefined }),
		};
		const db = {
			query: {
				creemSubscription: {
					findFirst: async () => {
						queryCount += 1;
						return {
							id: "checkout-request-1",
							referenceId: "user-1",
							productId: "pro-monthly",
							checkoutId: "checkout-1",
							checkoutUrl: "https://checkout.creem.io/checkout-1",
							creemSubscriptionId: null,
							creemCustomerId: null,
							creemOrderId: null,
							periodStart: null,
							periodEnd: null,
							lastWebhookId: null,
							lastWebhookCreatedAt: null,
							lastWebhookState: null,
						};
					},
				},
			},
			update: () => update,
			transaction: async (callback: (value: typeof tx) => unknown) =>
				callback(tx),
		} as unknown as DatabaseClient;

		const result = await syncCreemCheckout(
			db,
			{
				id: "checkout-1",
				webhookId: "event-checkout",
				webhookCreatedAt: new Date("2026-09-20T00:00:00.000Z").getTime(),
			},
			async () => ({
				id: "checkout-1",
				status: "completed",
				requestId: "checkout-request-1",
				product: "pro-yearly",
				customer: { id: "customer-1" },
				metadata: { referenceId: "user-1" },
				order: { id: "order-1" },
				subscription: {
					id: "subscription-1",
					status: "active",
					product: "pro-yearly",
					customer: { id: "customer-1" },
					currentPeriodStartDate: new Date("2026-09-20T00:00:00.000Z"),
					currentPeriodEndDate: new Date("2026-10-20T00:00:00.000Z"),
				},
			}),
		);

		assert.equal(queryCount, 2);
		assert.equal(result?.accepted, true);
		assert.equal(values[0]?.status, "active");
		assert.equal(values[0]?.productId, "pro-yearly");
		assert.equal(values[0]?.creemSubscriptionId, "subscription-1");
		assert.equal(values[0]?.creemCustomerId, "customer-1");
		assert.deepEqual(values[1], { creemCustomerId: "customer-1" });
	});

	/**
	 * Case ID: CREEM-WEBHOOK-003
	 * Given: a subscription is already linked to the user's local row.
	 * When: a newer subscription webhook omits metadata.referenceId.
	 * Then: the matching linked row is updated without changing its owner.
	 * Evidence: persisted status and webhook ID match the event.
	 * Result: Pass | Fail | Blocked | Not Run
	 */
	it("CREEM-WEBHOOK-003 updates a linked subscription when event metadata is missing", async () => {
		const saved: Record<string, unknown>[] = [];
		const update = {
			set(values: Record<string, unknown>) {
				saved.push(values);
				return update;
			},
			where: async () => undefined,
		};
		const tx = {
			execute: async () => undefined,
			delete: () => ({ where: async () => undefined }),
		};
		const db = {
			query: {
				creemSubscription: {
					findFirst: async () => ({
						id: "row-1",
						referenceId: "user-1",
						creemCustomerId: "customer-1",
						creemOrderId: null,
						periodStart: null,
						periodEnd: null,
						lastWebhookId: "event-old",
						lastWebhookCreatedAt: new Date("2026-09-19T00:00:00.000Z"),
						lastWebhookState: null,
					}),
				},
			},
			update: () => update,
			transaction: async (callback: (value: typeof tx) => unknown) =>
				callback(tx),
		} as unknown as DatabaseClient;

		const result = await syncCreemWebhook(db, {
			webhookId: "event-new",
			webhookCreatedAt: new Date("2026-09-20T00:00:00.000Z").getTime(),
			id: "subscription-1",
			status: "active",
			product: { id: "pro-monthly" },
		});

		assert.equal(result?.userId, "user-1");
		assert.equal(saved[0]?.status, "active");
		assert.equal(saved[0]?.lastWebhookId, "event-new");
	});

	/**
	 * Case ID: CREEM-WEBHOOK-004
	 * Given: a current subscription period has already been paid.
	 * When: Creem confirms a successful refund for that subscription.
	 * Then: Pro access ends at the refund event time.
	 * Evidence: saved status is refunded and saved period end equals refund time.
	 * Result: Pass | Fail | Blocked | Not Run
	 */
	it("CREEM-WEBHOOK-004 revokes access after a successful subscription refund", async () => {
		const saved: Record<string, unknown>[] = [];
		const update = {
			set(values: Record<string, unknown>) {
				saved.push(values);
				return update;
			},
			where: async () => undefined,
		};
		const tx = {
			execute: async () => undefined,
			delete: () => ({ where: async () => undefined }),
		};
		const db = {
			query: {
				creemSubscription: {
					findFirst: async () => ({
						id: "row-1",
						referenceId: "user-1",
						productId: "pro-monthly",
						creemCustomerId: "customer-1",
						creemOrderId: "order-1",
						periodStart: new Date("2026-09-01T00:00:00.000Z"),
						periodEnd: new Date("2026-10-01T00:00:00.000Z"),
						lastWebhookId: "event-paid",
						lastWebhookCreatedAt: new Date("2026-09-20T00:00:00.000Z"),
						lastWebhookState: null,
					}),
				},
			},
			update: () => update,
			transaction: async (callback: (value: typeof tx) => unknown) =>
				callback(tx),
		} as unknown as DatabaseClient;
		const refundedAt = new Date("2026-09-21T00:00:00.000Z");

		const result = await syncCreemRefund(db, {
			status: "succeeded",
			subscription: { id: "subscription-1" },
			webhookId: "event-refund",
			webhookCreatedAt: refundedAt.getTime(),
		});

		assert.equal(result?.userId, "user-1");
		assert.equal(saved[0]?.status, "refunded");
		assert.deepEqual(saved[0]?.periodEnd, refundedAt);
	});
});
