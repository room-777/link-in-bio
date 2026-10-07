import assert from "node:assert/strict";
import { describe, it, mock } from "node:test";
import { PageDomainError } from "@grabbin/application/page-domain";
import { Hono } from "hono";
import { createApiCors } from "../../src/middlewares/cors.middleware";
import type { AppEnv } from "../../src/types";

function fixture() {
	const lookups: string[] = [];
	const app = new Hono<AppEnv>().use(
		createApiCors({
			origin: "https://grabbin.me",
			resolveDomain: async (hostname) => {
				lookups.push(hostname);
				if (hostname === "invalid.example")
					throw new PageDomainError("DOMAIN_INVALID");
				return hostname === "test2.bybu.cc" ? { handle: "test" } : null;
			},
		}),
	);
	app.all("/*", (c) => c.json({ todayViews: 8, yesterdayViews: 21 }));
	return { app, lookups };
}

describe("custom domain API CORS", () => {
	/** Case ID: DOMAIN-CORS-001
	 * Given: an active domain mapped to test. When: it requests its public views.
	 * Then: allow the exact origin and preserve credential-compatible headers.
	 * Evidence: HTTP 200, JSON, allow-origin, allow-credentials and Vary. Result: Pass | Fail | Blocked | Not Run
	 */
	it("DOMAIN-CORS-001 allows views from the active page domain", async () => {
		const { app, lookups } = fixture();
		const response = await app.request(
			"/pages/test/views?timezone=Asia%2FSeoul",
			{
				headers: { Origin: "https://test2.bybu.cc" },
			},
		);
		assert.equal(response.status, 200);
		assert.equal(
			response.headers.get("Access-Control-Allow-Origin"),
			"https://test2.bybu.cc",
		);
		assert.equal(
			response.headers.get("Access-Control-Allow-Credentials"),
			"true",
		);
		assert.match(response.headers.get("Vary") ?? "", /Origin/);
		assert.deepEqual(await response.json(), {
			todayViews: 8,
			yesterdayViews: 21,
		});
		assert.deepEqual(lookups, ["test2.bybu.cc"]);
	});
	/** Case ID: DOMAIN-CORS-002
	 * Given: an active page domain. When: a GET preflight requests tracing headers.
	 * Then: allow the origin and existing headers. Evidence: HTTP 204, origin and allowed headers. Result: Pass | Fail | Blocked | Not Run
	 */
	it("DOMAIN-CORS-002 allows public views preflight", async () => {
		const { app } = fixture();
		const response = await app.request("/pages/test/views", {
			method: "OPTIONS",
			headers: {
				Origin: "https://test2.bybu.cc",
				"Access-Control-Request-Method": "GET",
				"Access-Control-Request-Headers": "baggage,sentry-trace",
			},
		});
		assert.equal(response.status, 204);
		assert.equal(
			response.headers.get("Access-Control-Allow-Methods"),
			"GET,OPTIONS",
		);
		assert.equal(response.headers.get("Cache-Control"), "no-store");
		assert.equal(
			response.headers.get("Access-Control-Allow-Origin"),
			"https://test2.bybu.cc",
		);
		assert.match(
			response.headers.get("Access-Control-Allow-Headers") ?? "",
			/sentry-trace/,
		);
	});
	/** Case ID: DOMAIN-CORS-003
	 * Given: an unconnected domain, a different page, or an invalid origin.
	 * When: public views are requested. Then: omit allow-origin.
	 * Evidence: absent CORS permission for each boundary input. Result: Pass | Fail | Blocked | Not Run
	 */
	it("DOMAIN-CORS-003 denies inactive, mismatched and invalid origins", async () => {
		for (const [path, origin] of [
			["/pages/test/views", "https://unknown.bybu.cc"],
			["/pages/other/views", "https://test2.bybu.cc"],
			["/pages/test/views", "http://test2.bybu.cc"],
			["/pages/test/views", "https://test2.bybu.cc:8443"],
			["/pages/test/views", "https://test2.bybu.cc.evil.example"],
			["/pages/test/views", "https://test2.bybu.cc/path"],
			["/pages/test/views", "https://invalid.example"],
			["/pages/test/views", "null"],
			["/pages/%ZZ/views", "https://test2.bybu.cc"],
		] as const) {
			const { app } = fixture();
			const response = await app.request(path, { headers: { Origin: origin } });
			assert.equal(response.status, 200);
			assert.equal(
				response.headers.get("Access-Control-Allow-Origin"),
				null,
				origin,
			);
		}
	});
	/** Case ID: DOMAIN-CORS-004
	 * Given: an active custom domain. When: it requests private routes or write methods.
	 * Then: do not expand their CORS permissions or query domains.
	 * Evidence: absent allow-origin and zero domain lookups. Result: Pass | Fail | Blocked | Not Run
	 */
	it("DOMAIN-CORS-004 keeps authentication and writes restricted", async () => {
		const { app, lookups } = fixture();
		for (const [path, method] of [
			["/auth/get-session", "GET"],
			["/auth/creem/create-checkout", "POST"],
			["/pages/test", "GET"],
			["/pages/test/domain", "GET"],
			["/pages/test/views", "POST"],
			["/pages/test/views", "PATCH"],
			["/pages/test/views", "OPTIONS"],
		] as const) {
			const response = await app.request(path, {
				method,
				headers: {
					Origin: "https://test2.bybu.cc",
					"Access-Control-Request-Method": "POST",
				},
			});
			assert.equal(response.headers.get("Access-Control-Allow-Origin"), null);
		}
		assert.deepEqual(lookups, []);
	});
	/** Case ID: DOMAIN-CORS-005
	 * Given: the configured service origin. When: it accesses auth and write routes.
	 * Then: preserve existing CORS behavior without domain lookups.
	 * Evidence: exact origin, credential header and zero lookups. Result: Pass | Fail | Blocked | Not Run
	 */
	it("DOMAIN-CORS-005 preserves the service origin", async () => {
		const { app, lookups } = fixture();
		const response = await app.request("/auth/get-session", {
			headers: { Origin: "https://grabbin.me" },
		});
		assert.equal(
			response.headers.get("Access-Control-Allow-Origin"),
			"https://grabbin.me",
		);
		assert.equal(
			response.headers.get("Access-Control-Allow-Credentials"),
			"true",
		);
		const preflight = await app.request("/auth/creem/create-checkout", {
			method: "OPTIONS",
			headers: {
				Origin: "https://grabbin.me",
				"Access-Control-Request-Method": "POST",
			},
		});
		assert.equal(
			preflight.headers.get("Access-Control-Allow-Origin"),
			"https://grabbin.me",
		);
		assert.match(
			preflight.headers.get("Access-Control-Allow-Methods") ?? "",
			/POST/,
		);
		assert.deepEqual(lookups, []);
	});
	/** Case ID: DOMAIN-CORS-006
	 * Given: domain verification is unavailable. When: a custom-origin request arrives.
	 * Then: fail without granting CORS access. Evidence: HTTP 500 and absent allow-origin. Result: Pass | Fail | Blocked | Not Run
	 */
	it("DOMAIN-CORS-006 denies access when domain lookup fails", async () => {
		const log = mock.method(console, "error", () => {});
		try {
			const app = new Hono<AppEnv>().use(
				createApiCors({
					origin: "https://grabbin.me",
					resolveDomain: async () => {
						throw new Error("Domain lookup is unavailable.");
					},
				}),
			);
			app.get("/pages/test/views", (c) => c.json({ todayViews: 8 }));
			const response = await app.request("/pages/test/views", {
				headers: { Origin: "https://test2.bybu.cc" },
			});
			assert.equal(response.status, 500);
			assert.equal(response.headers.get("Access-Control-Allow-Origin"), null);
		} finally {
			log.mock.restore();
		}
	});
});
