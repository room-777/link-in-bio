import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { Hono } from "hono";
import { createMiddleware } from "hono/factory";

import type { AppEnv } from "../../src/types";

const { mock } = require("bun:test") as {
	mock: { module: (specifier: string, factory: () => unknown) => void };
};

mock.module("@grabbin/env/server", () => ({
	env: { CORS_ORIGIN: "https://grabbin.example" },
}));
mock.module("../../src/middlewares/session.middleware", () => ({
	requiredSession: async (_context: unknown, next: () => Promise<void>) =>
		next(),
	optionalSession: async (_context: unknown, next: () => Promise<void>) =>
		next(),
}));

const { createCalendlyController } = await import(
	"../../src/controllers/calendly.controller"
);
type CalendlyControllerDependencies = NonNullable<
	Parameters<typeof createCalendlyController>[0]
>;

function createApp({
	canConnect = async () => true,
	exchangeCode = async () => {},
	db = {},
	getPublicPage = async () => ({
		id: "page-1",
		userId: "user-1",
		handle: "avery",
		imageKey: null,
		imageSource: null,
		imageCrop: null,
		name: null,
		bio: null,
	}),
	listEvents = async () => [],
	listAvailability = async () => [],
}: {
	canConnect?: (input: {
		db: AppEnv["Variables"]["db"];
		userId: string;
		proProductIds: readonly string[];
	}) => Promise<boolean>;
	exchangeCode?: () => Promise<void>;
	db?: unknown;
	getPublicPage?: CalendlyControllerDependencies["getPublicPage"];
	listEvents?: CalendlyControllerDependencies["listEvents"];
	listAvailability?: CalendlyControllerDependencies["listAvailability"];
} = {}) {
	const sessionMiddleware = createMiddleware<AppEnv>(async (c, next) => {
		c.set("db", db as unknown as AppEnv["Variables"]["db"]);
		c.set("session", { user: { id: "user-1", email: "user@example.com" } });
		await next();
	});
	const controller = createCalendlyController({
		sessionMiddleware,
		publicSessionMiddleware: sessionMiddleware,
		exchangeCode,
		canConnect,
		getPublicPage,
		listEvents,
		listAvailability,
	});
	const app = new Hono<AppEnv>().route("/", controller);
	const env = {
		CALENDLY_CLIENT_ID: "client-id",
		CALENDLY_CLIENT_SECRET: "client-secret",
		CREEM_PRO_MONTHLY_PRODUCT_ID: "pro-monthly",
		CREEM_PRO_YEARLY_PRODUCT_ID: "pro-yearly",
	} as AppEnv["Bindings"];
	return { app, env };
}

describe("Calendly OAuth return path", () => {
	it("returns to the requested page after connecting", async () => {
		const { app, env } = createApp();
		const connectResponse = await app.request(
			"/auth/calendly/connect?return_to=%2Favery%3Fsettings%3Daccount",
			{},
			env,
		);
		const authorizationUrl = new URL(
			connectResponse.headers.get("location") ?? "",
		);
		const cookie = connectResponse.headers.get("set-cookie")?.split(";")[0];
		assert.ok(cookie);

		const callbackResponse = await app.request(
			`/auth/callback/calendly?code=code&state=${authorizationUrl.searchParams.get("state")}`,
			{ headers: { cookie } },
			env,
		);
		const returnUrl = new URL(callbackResponse.headers.get("location") ?? "");

		assert.equal(returnUrl.pathname, "/avery");
		assert.equal(returnUrl.searchParams.get("settings"), "account");
		assert.equal(returnUrl.searchParams.get("calendly"), "connected");
	});

	it("rejects an external OAuth return path", async () => {
		const { app, env } = createApp();
		const connectResponse = await app.request(
			"/auth/calendly/connect?return_to=https%3A%2F%2Fevil.example",
			{},
			env,
		);
		const authorizationUrl = new URL(
			connectResponse.headers.get("location") ?? "",
		);
		const cookie = connectResponse.headers.get("set-cookie")?.split(";")[0];
		assert.ok(cookie);

		const callbackResponse = await app.request(
			`/auth/callback/calendly?code=code&state=${authorizationUrl.searchParams.get("state")}`,
			{ headers: { cookie } },
			env,
		);
		const returnUrl = new URL(callbackResponse.headers.get("location") ?? "");

		assert.equal(returnUrl.pathname, "/");
		assert.equal(returnUrl.searchParams.get("calendly"), "connected");
	});

	it("blocks free users from starting the connection", async () => {
		const { app, env } = createApp({ canConnect: async () => false });
		const response = await app.request("/auth/calendly/connect", {}, env);

		assert.equal(response.status, 403);
		assert.equal(
			((await response.json()) as { code: string }).code,
			"PRO_REQUIRED",
		);
	});

	it("does not save a connection if Pro access ends during OAuth", async () => {
		let exchangeCalled = false;
		let accessChecks = 0;
		const { app, env } = createApp({
			canConnect: async () => ++accessChecks === 1,
			exchangeCode: async () => {
				exchangeCalled = true;
			},
		});
		const connectResponse = await app.request(
			"/auth/calendly/connect",
			{},
			env,
		);
		const authorizationUrl = new URL(
			connectResponse.headers.get("location") ?? "",
		);
		const cookie = connectResponse.headers.get("set-cookie")?.split(";")[0];
		assert.ok(cookie);

		const callbackResponse = await app.request(
			`/auth/callback/calendly?code=code&state=${authorizationUrl.searchParams.get("state")}`,
			{ headers: { cookie } },
			env,
		);
		const returnUrl = new URL(callbackResponse.headers.get("location") ?? "");

		assert.equal(returnUrl.searchParams.get("calendly_error"), "pro_required");
		assert.equal(exchangeCalled, false);
	});
});

describe("public Calendly Bento availability", () => {
	/**
	 * Case ID: CALENDLY-PUBLIC-001
	 * Given: a saved Calendly item and an active connected event exist.
	 * When: a visitor requests that item's availability.
	 * Then: the current event details and time-specific booking links are returned.
	 * Evidence: response.status=200; JSON contains the updated event and saved slot.
	 * Result: Pass
	 */
	it("loads current event details and available times for a saved item", async () => {
		const startTime = new Date(Date.now() + 2 * 60_000).toISOString();
		const endTime = new Date(Date.now() + 24 * 60 * 60_000).toISOString();
		const event = {
			uri: "https://api.calendly.com/event_types/event-1",
			name: "Updated intro call",
			duration: 30,
			description: null,
			schedulingUrl: "https://calendly.com/avery/intro",
			active: true,
		};
		const slot = {
			startTime: new Date(Date.now() + 3 * 60_000).toISOString(),
			schedulingUrl: "https://calendly.com/avery/intro/slot-1",
		};
		const { app, env } = createApp({
			db: {
				query: {
					pageItems: {
						findFirst: async () => ({
							type: "calendly",
							data: {
								eventTypeUri: event.uri,
								schedulingUrl: event.schedulingUrl,
							},
						}),
					},
				},
			},
			getPublicPage: async () => ({
				id: "page-1",
				userId: "user-1",
				handle: "avery",
				imageKey: null,
				imageSource: null,
				imageCrop: null,
				name: null,
				bio: null,
			}),
			listEvents: async () => [event],
			listAvailability: async () => [slot],
		});
		const response = await app.request(
			`/pages/avery/items/item-1/calendly?start_time=${encodeURIComponent(startTime)}&end_time=${encodeURIComponent(endTime)}`,
			{},
			env,
		);

		assert.equal(response.status, 200);
		assert.deepEqual(await response.json(), {
			event,
			times: [slot],
		});
	});
});
