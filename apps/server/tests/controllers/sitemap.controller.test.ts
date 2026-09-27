import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { Hono } from "hono";

import { createSitemapController } from "../../src/controllers/sitemap.controller";

describe("GET /pages/sitemap", () => {
	/**
	 * Case ID: PAGE-SITEMAP-API-001
	 * Given: public profile handles are available.
	 * When: GET /pages/sitemap is requested without a session.
	 * Then: the response lists handles and can be cached publicly.
	 * Evidence: HTTP status, response body, and Cache-Control header.
	 * Result: Pass | Fail | Blocked | Not Run
	 */
	it("PAGE-SITEMAP-API-001 returns public profile handles", async () => {
		const app = new Hono().route(
			"/pages/sitemap",
			createSitemapController(async () => ["avery", "jordan"]),
		);
		const response = await app.request("/pages/sitemap");

		assert.equal(response.status, 200);
		assert.deepEqual(await response.json(), { handles: ["avery", "jordan"] });
		assert.equal(response.headers.get("Cache-Control"), "public, max-age=3600");
	});
});
