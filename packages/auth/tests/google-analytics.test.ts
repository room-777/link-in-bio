import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	createServerEventTracker,
	type GoogleAnalyticsConfig,
} from "../src/google-analytics";

const config: GoogleAnalyticsConfig = {
	measurementId: "G-TEST123",
	apiSecret: "test-secret-not-real",
	mode: "validate",
};

describe("server purchase event", () => {
	it("sends the signed-in user and browser session to GA4", async () => {
		const calls: Array<{ url: string; body: Record<string, unknown> }> = [];
		const tracker = createServerEventTracker({
			config,
			waitUntil: () => undefined,
			fetch: (async (input: URL | string, init?: RequestInit) => {
				calls.push({
					url: String(input),
					body: JSON.parse(String(init?.body)),
				});
				return new Response('{"validationMessages":[]}', { status: 200 });
			}) as typeof fetch,
			log: () => undefined,
		});

		const result = await tracker.track({
			name: "purchase",
			userId: "internal-user-id",
			headers: new Headers({
				cookie:
					"_ga=GA1.1.111.222; _ga_TEST123=GS2.1.s1760000000$o3$g1$t1760000100; grabbin_ga_internal=1",
			}),
			params: {
				transaction_id: "order-123",
				value: 10,
				currency: "USD",
				items: [
					{
						item_id: "pro-monthly",
						item_name: "Pro monthly",
						price: 10,
						quantity: 1,
					},
				],
			},
		});

		assert.equal(result.sent, true);
		assert.equal(calls.length, 1);
		assert.equal(
			new URL(calls[0]?.url ?? "").origin +
				new URL(calls[0]?.url ?? "").pathname,
			"https://www.google-analytics.com/debug/mp/collect",
		);
		assert.deepEqual(calls[0]?.body, {
			client_id: "111.222",
			user_id: "internal-user-id",
			user_properties: { user_type: { value: "creator" } },
			events: [
				{
					name: "purchase",
					params: {
						transaction_id: "order-123",
						value: 10,
						currency: "USD",
						items: [
							{
								item_id: "pro-monthly",
								item_name: "Pro monthly",
								price: 10,
								quantity: 1,
							},
						],
						session_id: 1760000000,
						traffic_type: "internal",
						engagement_time_msec: 1,
					},
				},
			],
		});
	});

	it("reports network failures without exposing the API secret", async () => {
		const logs: Array<[string, Record<string, unknown>]> = [];
		const tracker = createServerEventTracker({
			config,
			waitUntil: () => undefined,
			fetch: (async () => {
				throw new Error("network down");
			}) as typeof fetch,
			log: (message, detail) => logs.push([message, detail]),
		});

		assert.deepEqual(
			await tracker.track({
				name: "purchase",
				userId: "internal-user-id",
				params: {
					transaction_id: "order-123",
					value: 10,
					currency: "USD",
					items: [
						{
							item_id: "pro-monthly",
							item_name: "Pro monthly",
							price: 10,
							quantity: 1,
						},
					],
				},
			}),
			{ sent: false, reason: "error" },
		);
		assert.equal(logs[0]?.[0], "ga server event failed");
		assert.ok(!JSON.stringify(logs).includes(config.apiSecret));
	});
});
