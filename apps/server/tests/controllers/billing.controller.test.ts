import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { DatabaseClient } from "@grabbin/db";
import type { Context, MiddlewareHandler, Next } from "hono";
import { Hono } from "hono";
import type { AppEnv } from "../../src/types";

const { mock } = require("bun:test") as {
	mock: { module: (specifier: string, factory: () => unknown) => void };
};

let checkoutResult: unknown;
const events: Record<string, unknown>[] = [];

mock.module("@grabbin/auth/creem-server", () => ({
	createCreemClient: () => ({}),
}));
mock.module("@grabbin/auth/server-events", () => ({
	serverEvents: {
		track: (event: Record<string, unknown>) => events.push(event),
	},
}));
mock.module("../../src/middlewares/session.middleware", () => ({
	requiredSession: (async (c: Context<AppEnv>, next: Next) => {
		c.set("db", {} as DatabaseClient);
		c.set("session", { user: { id: "user-1", email: "user@example.com" } });
		await next();
	}) as MiddlewareHandler<AppEnv>,
	optionalSession: async (_context: unknown, next: () => Promise<void>) =>
		next(),
}));
mock.module("../../src/services/billing.service", () => ({
	createOrResumeProCheckout: async () => checkoutResult,
	resumeProCancellation: async () => false,
	scheduleProCancellation: async () => false,
}));

const { billingController } = await import(
	"../../src/controllers/billing.controller"
);
const app = new Hono<AppEnv>().route("/", billingController);
const bindings = {
	CREEM_PRO_MONTHLY_PRODUCT_ID: "pro-monthly",
	CREEM_PRO_YEARLY_PRODUCT_ID: "pro-yearly",
	CREEM_SUCCESS_URL: "https://grabbin.me/billing",
	CREEM_API_KEY: "test-key",
	CREEM_TEST_MODE: "true",
} as AppEnv["Bindings"];

async function startCheckout() {
	return app.request(
		"/auth/creem/create-checkout",
		{
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ productId: "pro-monthly" }),
		},
		bindings,
	);
}

describe("billing controller GA events", () => {
	/**
	 * Case ID: BILLING-GA-001
	 * Given: Creem returns a checkout URL for the selected plan.
	 * When: the authenticated checkout endpoint returns the URL.
	 * Then: begin_checkout is sent with the selected product and no purchase event.
	 * Evidence: HTTP response and captured server event.
	 * Result: Pass | Fail | Blocked | Not Run
	 */
	it("BILLING-GA-001 sends begin_checkout only when the checkout URL is returned", async () => {
		events.length = 0;
		checkoutResult = {
			kind: "checkout",
			url: "https://checkout.creem.io/ch-1",
		};

		const response = await startCheckout();

		assert.equal(response.status, 200);
		assert.deepEqual(await response.json(), {
			url: "https://checkout.creem.io/ch-1",
			redirect: false,
		});
		assert.equal(events.length, 1);
		const event = events[0];
		assert.ok(event);
		assert.equal(event.name, "begin_checkout");
		assert.equal(event.userId, "user-1");
		assert.equal(
			(event.headers as Headers).get("content-type"),
			"application/json",
		);
		assert.deepEqual(event.params, {
			items: [{ item_id: "pro-monthly", item_name: "Grabbin Pro" }],
		});
	});

	/**
	 * Case ID: BILLING-GA-002
	 * Given: Creem confirms an already-completed checkout with a paid order.
	 * When: the API returns to the success page.
	 * Then: purchase is sent from the validated order and begin_checkout is not sent.
	 * Evidence: HTTP response and captured server event.
	 * Result: Pass | Fail | Blocked | Not Run
	 */
	it("BILLING-GA-002 records only the completed purchase on reconciliation", async () => {
		events.length = 0;
		const purchase = {
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
		};
		checkoutResult = {
			kind: "completed",
			url: "https://grabbin.me/billing",
			purchase,
		};

		const response = await startCheckout();

		assert.equal(response.status, 200);
		assert.equal(events.length, 1);
		const event = events[0];
		assert.ok(event);
		assert.equal(event.name, "purchase");
		assert.equal(event.userId, "user-1");
		assert.deepEqual(event.params, purchase);
	});
});
