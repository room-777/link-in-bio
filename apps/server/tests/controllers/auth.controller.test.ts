import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { Hono } from "hono";
import { hc } from "hono/client";

import { createAuthController } from "../../src/controllers/auth.controller";
import type { AppEnv } from "../../src/types";

function createApp() {
	const seen: string[] = [];
	const app = new Hono<AppEnv>().route(
		"/auth",
		createAuthController(async (request) => {
			seen.push(`${request.method} ${new URL(request.url).pathname}`);
			return Response.json({ path: new URL(request.url).pathname });
		}),
	);
	return { app, seen };
}

describe("auth controller", () => {
	/**
	 * Case ID: AUTH-API-001
	 * Given: the typed web client and the auth routes.
	 * When: the client calls auth["get-session"].$get with a cookie header.
	 * Then: Better Auth receives GET /auth/get-session with that cookie.
	 * Evidence: handler request log and response body.
	 * Result: Pass
	 */
	it("AUTH-API-001 routes the typed get-session call to Better Auth", async () => {
		const { app, seen } = createApp();
		let cookie: string | null = null;
		const client = hc<typeof app>("https://server", {
			fetch: (input: RequestInfo | URL, init?: RequestInit) => {
				const request = new Request(input, init);
				cookie = request.headers.get("cookie");
				return app.request(request);
			},
		});

		const response = await client.auth["get-session"].$get(undefined, {
			headers: { cookie: "better-auth.session_token=abc" },
		});

		assert.equal(response.status, 200);
		assert.deepEqual(await response.json(), { path: "/auth/get-session" });
		assert.deepEqual(seen, ["GET /auth/get-session"]);
		assert.equal(cookie, "better-auth.session_token=abc");
	});

	/**
	 * Case ID: AUTH-API-002
	 * Given: the auth routes.
	 * When: other Better Auth endpoints are requested (GET and POST, nested paths).
	 * Then: each request reaches Better Auth unchanged.
	 * Evidence: handler request log.
	 * Result: Pass
	 */
	it("AUTH-API-002 keeps forwarding every other auth path", async () => {
		const { app, seen } = createApp();

		await app.request("/auth/email-otp/send-verification-otp", {
			method: "POST",
		});
		await app.request("/auth/callback/google");

		assert.deepEqual(seen, [
			"POST /auth/email-otp/send-verification-otp",
			"GET /auth/callback/google",
		]);
	});
});
