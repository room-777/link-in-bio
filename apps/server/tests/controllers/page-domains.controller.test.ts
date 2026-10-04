import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { Hono } from "hono";
import { createPageDomainsController } from "../../src/controllers/page-domains.controller";
import type { AppEnv } from "../../src/types";
import { domainFixture, present } from "../fixtures/page-domain.fixture";

function fixture() {
	const f = domainFixture();
	const app = new Hono<AppEnv>().route(
		"/pages",
		createPageDomainsController({
			service: () => f.service,
			sessionMiddleware: async (c, next) => {
				const id = c.req.header("X-Test-User");
				c.set(
					"session",
					id ? { user: { id, email: `${id}@example.test` } } : null,
				);
				await next();
			},
		}),
	);
	app.get("/pages/public", (c) => c.json({ public: true }));
	return {
		...f,
		app,
		request: (path: string, method = "GET", body?: string, user = "owner-a") =>
			app.request(`/pages/${path}`, {
				method,
				headers: { "X-Test-User": user, "Content-Type": "application/json" },
				body,
			}),
	};
}

describe("page domain HTTP API", () => {
	/** Case ID: DOMAIN-API-001
	 * Given: no session. When: all four domain routes are called.
	 * Then: return uncached 401 while public page routes remain public.
	 * Evidence: HTTP status, Cache-Control, problem content type and public-route status. Result: Pass | Fail | Blocked | Not Run
	 */
	it("DOMAIN-API-001 requires a session only for domain routes", async () => {
		const f = fixture();
		for (const [path, method] of [
			["avery/domain", "GET"],
			["avery/domain", "POST"],
			["avery/domain/check", "POST"],
			["avery/domain", "DELETE"],
		]) {
			const response = await f.app.request(`/pages/${path}`, { method });
			assert.equal(response.status, 401);
			assert.equal(response.headers.get("Cache-Control"), "no-store");
			assert.match(
				present(response.headers.get("Content-Type")),
				/application\/problem\+json/,
			);
		}
		assert.equal((await f.app.request("/pages/public")).status, 200);
	});
	/** Case ID: DOMAIN-API-002
	 * Given: invalid, empty, malformed or oversized JSON. When: connecting a hostname.
	 * Then: return 422 or 413 with no saved rows. Evidence: HTTP status and row count. Result: Pass | Fail | Blocked | Not Run
	 */
	it("DOMAIN-API-002 validates JSON and limits request size", async () => {
		const f = fixture();
		for (const body of [
			"{",
			"{}",
			'{"hostname":42}',
			'{"hostname":""}',
			'{"hostname":"example.com"}',
			'{"hostname":"https://hello.example.com"}',
		]) {
			assert.equal((await f.request("avery/domain", "POST", body)).status, 422);
		}
		assert.equal(
			(
				await f.request(
					"avery/domain",
					"POST",
					JSON.stringify({ hostname: "x".repeat(2000) }),
				)
			).status,
			413,
		);
		assert.equal(f.rows.size, 0);
	});
	/** Case ID: DOMAIN-API-003
	 * Given: free users and a different page owner. When: connecting or viewing.
	 * Then: return 403 or 404. Evidence: HTTP statuses and application error codes. Result: Pass | Fail | Blocked | Not Run
	 */
	it("DOMAIN-API-003 maps permission failures", async () => {
		const f = fixture();
		f.plans.set("owner-a", []);
		const denied = await f.request(
			"avery/domain",
			"POST",
			'{"hostname":"hello.example.com"}',
		);
		assert.equal(denied.status, 403);
		assert.equal(
			((await denied.json()) as { code: string }).code,
			"PRO_REQUIRED",
		);
		assert.equal(
			(await f.request("avery/domain", "GET", undefined, "owner-b")).status,
			404,
		);
	});
	/** Case ID: DOMAIN-API-004
	 * Given: a Pro owner. When: registering, viewing and submitting another hostname.
	 * Then: return both DNS records, stable binding and a 409 conflict.
	 * Evidence: response records, no-store header, ID and conflict status. Result: Pass | Fail | Blocked | Not Run
	 */
	it("DOMAIN-API-004 returns configuration and prevents a second domain", async () => {
		const f = fixture();
		const connected = await f.request(
			"avery/domain",
			"POST",
			'{"hostname":"hello.example.com"}',
		);
		assert.equal(connected.status, 200);
		assert.equal(connected.headers.get("Cache-Control"), "no-store");
		const result = (await connected.json()) as {
			domain: {
				id: string;
				records: { type: string; name: string; value: string }[];
			};
		};
		assert.deepEqual(result.domain.records[0], {
			type: "CNAME",
			name: "hello.example.com",
			value: "custom.grabbin.me",
		});
		assert.equal(
			present(result.domain.records[1]).name,
			"_grabbin.hello.example.com",
		);
		assert.match(
			present(result.domain.records[1]).value,
			/^grabbin-verification=/,
		);
		assert.equal(
			((await (await f.request("avery/domain")).json()) as typeof result).domain
				.id,
			result.domain.id,
		);
		assert.equal(
			(
				await f.request(
					"avery/domain",
					"POST",
					'{"hostname":"other.example.com"}',
				)
			).status,
			409,
		);
	});
	/** Case ID: DOMAIN-API-005
	 * Given: a recently checked domain. When: checking again immediately.
	 * Then: return 429 with Retry-After. Evidence: HTTP status and Retry-After header. Result: Pass | Fail | Blocked | Not Run
	 */
	it("DOMAIN-API-005 exposes the check cooldown", async () => {
		const f = fixture();
		await f.active();
		const response = await f.request("avery/domain/check", "POST");
		assert.equal(response.status, 429);
		assert.equal(response.headers.get("Retry-After"), "30");
	});
	/** Case ID: DOMAIN-API-006
	 * Given: a missing connection. When: checking or disconnecting.
	 * Then: checking returns 404 and repeated disconnect is harmless.
	 * Evidence: HTTP statuses and null domain response. Result: Pass | Fail | Blocked | Not Run
	 */
	it("DOMAIN-API-006 treats missing connections consistently", async () => {
		const f = fixture();
		assert.equal((await f.request("avery/domain/check", "POST")).status, 404);
		const deleted = await f.request("avery/domain", "DELETE");
		assert.equal(deleted.status, 200);
		assert.deepEqual(await deleted.json(), { domain: null });
	});
	/** Case ID: DOMAIN-API-007
	 * Given: an active provider hostname whose deletion fails. When: disconnect is requested.
	 * Then: return accepted deletion and deny public routing until retry.
	 * Evidence: HTTP 202, deleting response, retained row and null resolver result. Result: Pass | Fail | Blocked | Not Run
	 */
	it("DOMAIN-API-007 reports retryable deletion", async () => {
		const f = fixture();
		const row = await f.active();
		f.failProvider("DELETE");
		const response = await f.request("avery/domain", "DELETE");
		assert.equal(response.status, 202);
		assert.equal(
			((await response.json()) as { domain: { status: string } }).domain.status,
			"deleting",
		);
		assert.equal(f.rows.size, 1);
		assert.equal(await f.service.resolve(row.hostname), null);
	});
	/** Case ID: DOMAIN-API-008
	 * Given: an active custom hostname. When: its visitor requests page routing.
	 * Then: return the public page handle without a session; inactive claims are hidden.
	 * Evidence: route status, handle, cache policy and inactive 404. Result: Pass | Fail | Blocked | Not Run
	 */
	it("DOMAIN-API-008 resolves active domains for public page routing", async () => {
		const f = fixture();
		const row = await f.active();
		const response = await f.app.request(`/pages/domain/${row.hostname}`);
		assert.equal(response.status, 200);
		assert.equal(response.headers.get("Cache-Control"), "no-store");
		assert.deepEqual(await response.json(), { handle: "avery" });

		const pending = await f.request(
			"blair/domain",
			"POST",
			'{"hostname":"other.example.com"}',
			"owner-b",
		);
		assert.equal(pending.status, 200);
		assert.equal(
			(await f.app.request("/pages/domain/other.example.com")).status,
			404,
		);
	});
});
