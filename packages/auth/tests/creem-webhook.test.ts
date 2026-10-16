import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { DatabaseClient } from "@grabbin/db";
import {
	syncCreemCheckout,
	syncCreemRefund,
	syncCreemSubscriptionPaid,
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
		let orderStatus = "paid";

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
				product: {
					id: "pro-yearly",
					name: "Grabbin Pro Yearly",
					price: 12000,
					currency: "USD",
					taxMode: "exclusive",
				},
				units: 1,
				customer: { id: "customer-1" },
				metadata: { referenceId: "user-1" },
				order: {
					id: "order-1",
					transaction: "transaction-1",
					product: "pro-yearly",
					amount: 12000,
					taxAmount: 1200,
					amountPaid: 13200,
					currency: "USD",
					status: orderStatus,
				},
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
		assert.deepEqual(result?.purchase, {
			transaction_id: "order-1",
			value: 120,
			currency: "USD",
			items: [
				{
					item_id: "pro-yearly",
					item_name: "Grabbin Pro Yearly",
					price: 120,
					quantity: 1,
				},
			],
		});

		orderStatus = "pending";
		const retry = await syncCreemCheckout(
			db,
			{
				id: "checkout-1",
				webhookId: "event-checkout-retry",
				webhookCreatedAt: new Date("2026-09-21T00:00:00.000Z").getTime(),
			},
			async () => ({
				id: "checkout-1",
				status: "completed",
				requestId: "checkout-request-1",
				product: {
					id: "pro-yearly",
					name: "Grabbin Pro Yearly",
					price: 12000,
					currency: "USD",
					taxMode: "exclusive",
				},
				units: 1,
				customer: { id: "customer-1" },
				metadata: { referenceId: "user-1" },
				order: {
					id: "order-1",
					transaction: "transaction-1",
					product: "pro-yearly",
					amount: 12000,
					taxAmount: 1200,
					amountPaid: 13200,
					currency: "USD",
					status: orderStatus,
				},
				subscription: {
					id: "subscription-1",
					status: "active",
					product: "pro-yearly",
					customer: { id: "customer-1" },
				},
			}),
		);
		assert.equal(retry?.purchase, null);

		const inclusive = await syncCreemCheckout(
			db,
			{
				id: "checkout-1",
				webhookId: "event-checkout-inclusive",
				webhookCreatedAt: new Date("2026-09-22T00:00:00.000Z").getTime(),
			},
			async () => ({
				id: "checkout-1",
				status: "completed",
				requestId: "checkout-request-1",
				product: {
					id: "pro-yearly",
					name: "Grabbin Pro Yearly",
					price: 12000,
					currency: "USD",
					taxMode: "inclusive",
				},
				units: 1,
				customer: { id: "customer-1" },
				metadata: { referenceId: "user-1" },
				order: {
					id: "order-1",
					transaction: "transaction-1",
					product: "pro-yearly",
					amount: 12000,
					taxAmount: 1200,
					amountPaid: 12000,
					currency: "USD",
					status: "paid",
				},
				subscription: {
					id: "subscription-1",
					status: "active",
					product: "pro-yearly",
					customer: { id: "customer-1" },
				},
			}),
		);
		assert.equal(inclusive?.purchase?.value, 108);
		assert.equal(inclusive?.purchase?.items[0]?.price, 108);
	});

	/**
	 * Case ID: CREEM-WEBHOOK-006
	 * Given: a subscription.paid webhook points to a completed invoice transaction.
	 * When: Creem transaction retrieval confirms its status, owner, product and amount.
	 * Then: the transaction ID and pre-tax amount form a purchase; refunds and failed charges do not.
	 * Evidence: purchase payload for a paid renewal and null payload for refunded or declined transactions.
	 * Result: Pass | Fail | Blocked | Not Run
	 */
	it("CREEM-WEBHOOK-006 records verified renewals and excludes refunded or failed transactions", async () => {
		const makeDb = () => {
			const update = {
				set: () => update,
				where: async () => undefined,
			};
			const tx = {
				execute: async () => undefined,
				delete: () => ({ where: async () => undefined }),
			};
			return {
				query: {
					creemSubscription: {
						findFirst: async () => ({
							id: "subscription-row",
							referenceId: "user-1",
							productId: "pro-yearly",
							creemSubscriptionId: "subscription-1",
							creemCustomerId: "customer-1",
							creemOrderId: "initial-order",
							periodStart: null,
							periodEnd: null,
							lastWebhookId: "previous-event",
							lastWebhookCreatedAt: new Date("2026-09-20T00:00:00.000Z"),
							lastWebhookState: null,
						}),
					},
				},
				update: () => update,
				transaction: async (callback: (value: typeof tx) => unknown) =>
					callback(tx),
			} as unknown as DatabaseClient;
		};
		const event = {
			webhookId: "paid-event-1",
			webhookCreatedAt: new Date("2026-10-20T00:00:00.000Z").getTime(),
			id: "subscription-1",
			status: "active",
			product: {
				id: "pro-yearly",
				name: "Grabbin Pro Yearly",
				price: 12000,
				currency: "USD",
				tax_mode: "exclusive",
			},
			customer: { id: "customer-1" },
			last_transaction_id: "transaction-renewal-1",
			metadata: { referenceId: "user-1" },
		};
		const transaction = {
			id: "transaction-renewal-1",
			status: "paid",
			type: "invoice",
			amount: 12000,
			amountPaid: 13200,
			taxAmount: 1200,
			currency: "USD",
			order: "renewal-order-1",
			subscription: "subscription-1",
			customer: "customer-1",
		};

		const result = await syncCreemSubscriptionPaid(
			makeDb(),
			event,
			async () => transaction,
		);
		assert.deepEqual(result?.purchase, {
			transaction_id: "renewal-order-1",
			value: 120,
			currency: "USD",
			items: [
				{
					item_id: "pro-yearly",
					item_name: "Grabbin Pro Yearly",
					price: 120,
					quantity: 1,
				},
			],
		});
		const retry = await syncCreemSubscriptionPaid(
			makeDb(),
			{ ...event, webhookId: "paid-event-retry" },
			async () => transaction,
		);
		assert.equal(
			retry?.purchase?.transaction_id,
			result?.purchase?.transaction_id,
		);
		const inclusive = await syncCreemSubscriptionPaid(
			makeDb(),
			{
				...event,
				product: { ...event.product, tax_mode: "inclusive" },
			},
			async () => ({
				...transaction,
				amountPaid: 12000,
			}),
		);
		assert.equal(inclusive?.purchase?.value, 108);
		assert.equal(inclusive?.purchase?.items[0]?.price, 108);

		const discounted = await syncCreemSubscriptionPaid(
			makeDb(),
			{ ...event, items: [{ product_id: "pro-yearly", units: 2 }] },
			async () => ({
				...transaction,
				amount: 20000,
				amountPaid: 22000,
				discountAmount: 4000,
				taxAmount: 2000,
			}),
		);
		assert.deepEqual(discounted?.purchase?.items[0], {
			item_id: "pro-yearly",
			item_name: "Grabbin Pro Yearly",
			price: 100,
			quantity: 2,
		});
		assert.equal(discounted?.purchase?.value, 200);

		const unevenDiscount = await syncCreemSubscriptionPaid(
			makeDb(),
			event,
			async () => ({
				...transaction,
				amount: 19999,
				amountPaid: 21199,
				discountAmount: 4001,
			}),
		);
		assert.equal(unevenDiscount?.purchase, null);

		for (const status of ["refunded", "declined"]) {
			const excluded = await syncCreemSubscriptionPaid(
				makeDb(),
				event,
				async () => ({ ...transaction, status }),
			);
			assert.equal(excluded?.purchase, null, `${status} transaction`);
		}
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
	 * Evidence: saved status is expired and saved period end equals refund time.
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
		assert.equal(saved[0]?.status, "expired");
		assert.deepEqual(saved[0]?.periodEnd, refundedAt);
	});

	/**
	 * Case ID: CREEM-WEBHOOK-005
	 * Given: Creem sends a subscription status outside its SubscriptionStatus type.
	 * When: the webhook is synchronized.
	 * Then: the boundary throws and nothing is saved.
	 * Evidence: rejected promise with the unknown status and zero update calls.
	 * Result: Pass | Fail | Blocked | Not Run
	 */
	it("CREEM-WEBHOOK-005 rejects an unknown subscription status", async () => {
		let updates = 0;
		const db = {
			query: {
				creemSubscription: {
					findFirst: async () => ({
						id: "row-1",
						referenceId: "user-1",
						creemCustomerId: null,
						creemOrderId: null,
						periodStart: null,
						periodEnd: null,
						lastWebhookId: null,
						lastWebhookCreatedAt: null,
						lastWebhookState: null,
					}),
				},
			},
			update: () => {
				updates += 1;
				throw new Error("must not save");
			},
		} as unknown as DatabaseClient;

		await assert.rejects(
			syncCreemWebhook(db, {
				webhookId: "event-1",
				webhookCreatedAt: Date.now(),
				id: "subscription-1",
				status: "paid",
				product: { id: "pro-monthly" },
			}),
			/Unknown Creem subscription status: paid/,
		);
		assert.equal(updates, 0);
	});
});
