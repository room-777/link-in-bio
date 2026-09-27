import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { DatabaseClient } from "@grabbin/db";
import {
	createOrResumeProCheckout,
	getAccountPlan,
	scheduleProCancellation,
} from "../../src/services/billing.service";

type CheckoutClient = Parameters<typeof createOrResumeProCheckout>[0]["creem"];

function setup(inputRows: Record<string, unknown>[] = []) {
	const rows = [...inputRows];
	let createCalls = 0;
	let retrieveCalls = 0;
	let retrieveStatus = "pending";
	const tx = {
		execute: async () => undefined,
		query: { creemSubscription: { findMany: async () => [...rows] } },
		insert: () => ({
			values: async (row: Record<string, unknown>) => {
				rows.push(row);
			},
		}),
		delete: () => ({
			where: async () => {
				rows.splice(0);
			},
		}),
	};
	const db = {
		transaction: async (callback: (value: typeof tx) => unknown) =>
			callback(tx),
	} as unknown as DatabaseClient;
	const creem = {
		checkouts: {
			create: async () => {
				createCalls += 1;
				return {
					id: "ch_new",
					checkoutUrl: "https://checkout.creem.io/ch_new",
				};
			},
			retrieve: async () => {
				retrieveCalls += 1;
				return {
					status: retrieveStatus,
					checkoutUrl: "https://checkout.creem.io/ch_existing",
				};
			},
		},
	} as unknown as CheckoutClient;
	return {
		db,
		creem,
		rows,
		get createCalls() {
			return createCalls;
		},
		get retrieveCalls() {
			return retrieveCalls;
		},
		set retrieveStatus(value: string) {
			retrieveStatus = value;
		},
	};
}

function run(input: ReturnType<typeof setup>) {
	return createOrResumeProCheckout({
		db: input.db,
		creem: input.creem,
		userId: "user-1",
		email: "user@example.com",
		productId: "pro-monthly",
		successUrl: "https://grabbin.me/billing",
	});
}

describe("billing service", () => {
	/**
	 * Case ID: BILLING-CHECKOUT-001
	 * Given: a user has no current subscription or checkout.
	 * When: the user starts Pro checkout.
	 * Then: Creem creates one checkout and its ID and URL are saved as a pending account checkout.
	 * Evidence: result URL, one provider create call, and persisted checkout reference.
	 * Result: Pass | Fail | Blocked | Not Run
	 */
	it("BILLING-CHECKOUT-001 creates and stores one pending checkout", async () => {
		const state = setup();
		const result = await run(state);

		assert.deepEqual(result, { url: "https://checkout.creem.io/ch_new" });
		assert.equal(state.createCalls, 1);
		assert.equal(state.rows[0]?.checkoutId, "ch_new");
		assert.equal(state.rows[0]?.status, "pending");
	});

	/**
	 * Case ID: BILLING-CHECKOUT-002
	 * Given: the account has a pending checkout for the selected plan.
	 * When: the user requests checkout again.
	 * Then: the existing Creem URL is reused instead of creating another session.
	 * Evidence: one provider retrieve call, existing URL returned, and no new create call.
	 * Result: Pass | Fail | Blocked | Not Run
	 */
	it("BILLING-CHECKOUT-002 reuses an unfinished checkout", async () => {
		const state = setup([
			{
				id: "hold-1",
				referenceId: "user-1",
				productId: "pro-monthly",
				status: "pending",
				checkoutId: "ch_existing",
				checkoutUrl: "https://checkout.creem.io/ch_existing",
				creemSubscriptionId: null,
			},
		]);
		const result = await run(state);

		assert.deepEqual(result, { url: "https://checkout.creem.io/ch_existing" });
		assert.equal(state.retrieveCalls, 1);
		assert.equal(state.createCalls, 0);
	});

	/**
	 * Case ID: BILLING-CHECKOUT-003
	 * Given: the account already has an active Pro subscription.
	 * When: another checkout is requested.
	 * Then: the request is rejected before calling Creem.
	 * Evidence: SUBSCRIPTION_EXISTS result and zero provider calls.
	 * Result: Pass | Fail | Blocked | Not Run
	 */
	it("BILLING-CHECKOUT-003 prevents a second current subscription", async () => {
		const state = setup([
			{
				id: "subscription-1",
				referenceId: "user-1",
				productId: "pro-monthly",
				status: "active",
				periodEnd: new Date(Date.now() + 86400000),
				creemSubscriptionId: "sub_current",
			},
		]);
		const result = await run(state);

		assert.deepEqual(result, { error: "SUBSCRIPTION_EXISTS" });
		assert.equal(state.createCalls + state.retrieveCalls, 0);
	});

	/**
	 * Case ID: BILLING-CHECKOUT-004
	 * Given: the saved checkout is expired at Creem.
	 * When: the user requests the same plan again.
	 * Then: the old hold is cleared and a fresh checkout is created.
	 * Evidence: Creem reports expired, one new checkout is saved, and its URL is returned.
	 * Result: Pass | Fail | Blocked | Not Run
	 */
	it("BILLING-CHECKOUT-004 replaces an expired checkout session", async () => {
		const state = setup([
			{
				id: "hold-1",
				referenceId: "user-1",
				productId: "pro-monthly",
				status: "pending",
				checkoutId: "ch_old",
				checkoutUrl: "https://checkout.creem.io/ch_old",
				creemSubscriptionId: null,
			},
		]);
		state.retrieveStatus = "expired";
		const result = await run(state);

		assert.deepEqual(result, { url: "https://checkout.creem.io/ch_new" });
		assert.equal(state.retrieveCalls, 1);
		assert.equal(state.createCalls, 1);
		assert.equal(state.rows[0]?.checkoutId, "ch_new");
	});

	/**
	 * Case ID: BILLING-PLAN-001
	 * Given: Creem reports a canceled subscription without a period end.
	 * When: account access is calculated.
	 * Then: the account does not retain Pro access indefinitely.
	 * Evidence: the account plan resolves to Free and hasAccess=false.
	 * Result: Pass | Fail | Blocked | Not Run
	 */
	it("BILLING-PLAN-001 does not grant canceled subscriptions without an end date", async () => {
		const plan = await getAccountPlan({
			db: {
				query: {
					creemSubscription: {
						findMany: async () => [
							{
								creemSubscriptionId: "sub-1",
								productId: "pro-monthly",
								status: "canceled",
								periodEnd: null,
								cancelAtPeriodEnd: true,
							},
						],
					},
				},
			} as unknown as DatabaseClient,
			userId: "user-1",
			proProductIds: ["pro-monthly"],
		});

		assert.equal(plan.tier, "free");
		assert.equal(plan.hasAccess, false);
	});

	/**
	 * Case ID: BILLING-CANCEL-001
	 * Given: a user has an active subscription with a future period end.
	 * When: they cancel through Grabbin.
	 * Then: Creem receives a scheduled cancellation and the local row retains access through the period end.
	 * Evidence: provider cancellation mode and saved status, end date, and access flag.
	 * Result: Pass | Fail | Blocked | Not Run
	 */
	it("BILLING-CANCEL-001 schedules cancellation and keeps Pro through the paid period", async () => {
		const periodEnd = new Date(Date.now() + 86_400_000);
		const row = {
			id: "row-1",
			referenceId: "user-1",
			productId: "pro-monthly",
			creemSubscriptionId: "sub-1",
			status: "active",
			periodStart: null,
			periodEnd: null,
			cancelAtPeriodEnd: false,
		};
		let saved: Record<string, unknown> | undefined;
		let providerInput: Record<string, unknown> | undefined;
		const update = {
			set(values: Record<string, unknown>) {
				saved = values;
				return update;
			},
			where: async () => undefined,
		};
		const db = {
			query: {
				creemSubscription: { findFirst: async () => row },
			},
			update: () => update,
		} as unknown as DatabaseClient;
		const creem = {
			subscriptions: {
				cancel: async (_id: string, input: Record<string, unknown>) => {
					providerInput = input;
					return {
						id: "sub-1",
						status: "scheduled_cancel",
						currentPeriodStartDate: null,
						currentPeriodEndDate: periodEnd,
					};
				},
			},
		} as unknown as CheckoutClient;

		assert.equal(
			await scheduleProCancellation({ db, creem, userId: "user-1" }),
			true,
		);
		assert.deepEqual(providerInput, { mode: "scheduled", onExecute: "cancel" });
		assert.equal(saved?.status, "scheduled_cancel");
		assert.equal(saved?.cancelAtPeriodEnd, true);
		assert.equal(saved?.periodEnd, periodEnd);

		const plan = await getAccountPlan({
			db: {
				query: {
					creemSubscription: {
						findMany: async () => [
							{
								creemSubscriptionId: "sub-1",
								productId: "pro-monthly",
								status: saved?.status as string,
								periodEnd: saved?.periodEnd as Date,
								cancelAtPeriodEnd: saved?.cancelAtPeriodEnd as boolean,
							},
						],
					},
				},
			} as unknown as DatabaseClient,
			userId: "user-1",
			proProductIds: ["pro-monthly"],
		});
		assert.equal(plan.hasAccess, true);
	});

	/**
	 * Case ID: BILLING-PLAN-002
	 * Given: Creem marks a subscription canceled while its paid period remains.
	 * When: account access is calculated before that date.
	 * Then: Pro access remains enabled until the period ends.
	 * Evidence: the account plan returns Pro and hasAccess=true.
	 * Result: Pass | Fail | Blocked | Not Run
	 */
	it("BILLING-PLAN-002 keeps Pro when a canceled subscription has time remaining", async () => {
		const plan = await getAccountPlan({
			db: {
				query: {
					creemSubscription: {
						findMany: async () => [
							{
								creemSubscriptionId: "sub-1",
								productId: "pro-monthly",
								status: "canceled",
								periodEnd: new Date(Date.now() + 86_400_000),
								cancelAtPeriodEnd: false,
							},
						],
					},
				},
			} as unknown as DatabaseClient,
			userId: "user-1",
			proProductIds: ["pro-monthly"],
		});

		assert.equal(plan.tier, "pro");
		assert.equal(plan.hasAccess, true);
	});
});
