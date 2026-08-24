import {
	describe,
	expect,
	it,
} from "bun:test";
import { validateWebhookSignature } from "@creem_io/better-auth";
import {
	type CreemWebhookState,
	decideCreemWebhookState,
	syncCreemWebhookState,
	webhookCreatedAtToDate,
} from "./creem-webhook";

const state = (
	overrides: Partial<CreemWebhookState> = {},
): CreemWebhookState => ({
	webhookId: "evt_1",
	webhookCreatedAt: 100,
	status: "active",
	productId: "prod_1",
	creemCustomerId: "cust_1",
	creemSubscriptionId: "sub_1",
	creemOrderId: "order_1",
	periodStart:
		"2026-08-01T00:00:00.000Z",
	periodEnd: "2026-09-01T00:00:00.000Z",
	cancelAtPeriodEnd: false,
	...overrides,
});

const hmacSignature = async (
	payload: string,
	secret: string,
) => {
	const key =
		await crypto.subtle.importKey(
			"raw",
			new TextEncoder().encode(secret),
			{ name: "HMAC", hash: "SHA-256" },
			false,
			["sign"],
		);
	const signature =
		await crypto.subtle.sign(
			"HMAC",
			key,
			new TextEncoder().encode(payload),
		);
	return Array.from(
		new Uint8Array(signature),
	)
		.map((byte) =>
			byte
				.toString(16)
				.padStart(2, "0"),
		)
		.join("");
};

describe("Creem webhook state", () => {
	it("accepts the first event", () => {
		const incoming = state();

		expect(
			decideCreemWebhookState(
				null,
				incoming,
			),
		).toEqual({
			action: "accept",
			state: incoming,
		});
	});

	it("accepts a newer event", () => {
		const incoming = state({
			webhookId: "evt_2",
			webhookCreatedAt: 200,
			status: "paid",
		});

		expect(
			decideCreemWebhookState(
				state(),
				incoming,
			),
		).toEqual({
			action: "accept",
			state: incoming,
		});
	});

	it("restores the prior state for an older event", () => {
		const previous = state({
			webhookId: "evt_2",
			webhookCreatedAt: 200,
			status: "paid",
		});

		expect(
			decideCreemWebhookState(
				previous,
				state({
					webhookId: "evt_0",
					webhookCreatedAt: 50,
					status: "expired",
				}),
			),
		).toEqual({
			action: "restore",
			state: previous,
		});
	});

	it("restores the same state for a duplicate event", () => {
		const previous = state();

		expect(
			decideCreemWebhookState(
				previous,
				previous,
			),
		).toEqual({
			action: "restore",
			state: previous,
		});
	});

	it("converts Creem seconds and milliseconds safely", () => {
		expect(
			webhookCreatedAtToDate(
				1_756_646_400,
			),
		).toEqual(
			new Date(
				"2025-08-31T13:20:00.000Z",
			),
		);
		expect(
			webhookCreatedAtToDate(
				1_756_646_400_000,
			),
		).toEqual(
			new Date(
				"2025-08-31T13:20:00.000Z",
			),
		);
	});
});

describe("Creem webhook signature", () => {
	it("accepts the official HMAC signature", async () => {
		const payload =
			'{"eventType":"subscription.paid"}';
		const secret =
			"test-webhook-secret";

		expect(
			await validateWebhookSignature(
				payload,
				await hmacSignature(
					payload,
					secret,
				),
				secret,
			),
		).toBe(true);
	});

	it("rejects a changed payload and a missing signature", async () => {
		const payload =
			'{"eventType":"subscription.paid"}';
		const secret =
			"test-webhook-secret";
		const signature =
			await hmacSignature(
				payload,
				secret,
			);

		expect(
			await validateWebhookSignature(
				'{"eventType":"subscription.expired"}',
				signature,
				secret,
			),
		).toBe(false);
		expect(
			await validateWebhookSignature(
				payload,
				null,
				secret,
			),
		).toBe(false);
	});
});

describe("Creem webhook database sync", () => {
	it("restores the latest snapshot after an older event", async () => {
		const previous = state({
			webhookId: "evt_2",
			webhookCreatedAt: 200,
			status: "paid",
		});
		let update:
			| Record<string, unknown>
			| undefined;
		const db = {
			query: {
				creemSubscription: {
					findFirst: async () => ({
						id: "row_1",
						creemOrderId: "order_1",
						periodStart: new Date(
							previous.periodStart as string,
						),
						periodEnd: new Date(
							previous.periodEnd as string,
						),
						cancelAtPeriodEnd: false,
						lastWebhookState: previous,
					}),
				},
			},
			update: () => ({
				set: (
					values: Record<
						string,
						unknown
					>,
				) => ({
					where: async () => {
						update = values;
					},
				}),
			}),
		} as never;

		await syncCreemWebhookState(db, {
			webhookId: "evt_1",
			webhookCreatedAt: 100,
			creemSubscriptionId: "sub_1",
			status: "expired",
			productId: "prod_1",
			creemCustomerId: "cust_1",
			periodStart: previous.periodStart,
			periodEnd: previous.periodEnd,
		});

		expect(update).toMatchObject({
			status: "paid",
			lastWebhookId: "evt_2",
			lastWebhookState: previous,
		});
	});
});
