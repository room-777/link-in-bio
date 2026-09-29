import assert from "node:assert/strict";
import { describe, it } from "node:test";

const { mock } = require("bun:test") as {
	mock: { module: (specifier: string, factory: () => unknown) => void };
};

mock.module("@grabbin/env/server", () => ({
	env: {
		PAGE_DOMAIN: "example.test",
	},
}));

const { getPublicViews } = await import(
	"../../src/services/public-views.service"
);

describe("public views service", () => {
	/**
	 * Case ID: PUBLIC-VIEWS-001
	 * Given: Simple Analytics returns counts for both requested dates.
	 * When: views are requested twice for the same page and timezone.
	 * Then: both counts are returned and the second request uses the cache.
	 * Evidence: returned counts, two provider requests, and the page/timezone filters.
	 * Result: Pass | Fail | Blocked | Not Run
	 */
	it("PUBLIC-VIEWS-001 returns and caches today's and yesterday's views", async () => {
		const requestedUrls: URL[] = [];
		const originalFetch = globalThis.fetch;
		globalThis.fetch = (async (input: URL | RequestInfo) => {
			const url = new URL(input.toString());
			requestedUrls.push(url);
			return Response.json({ pageviews: requestedUrls.length === 1 ? 12 : 5 });
		}) as typeof fetch;

		try {
			const first = await getPublicViews(
				"case-page-001",
				"America/Los_Angeles",
			);
			const second = await getPublicViews(
				"case-page-001",
				"America/Los_Angeles",
			);

			assert.deepEqual(first, { todayViews: 12, yesterdayViews: 5 });
			assert.deepEqual(second, first);
			assert.equal(requestedUrls.length, 2);
			for (const url of requestedUrls) {
				assert.equal(url.hostname, "simpleanalytics.com");
				assert.equal(
					url.pathname,
					"/example.test/__analytics/pages/case-page-001.json",
				);
				assert.equal(url.searchParams.get("fields"), "pageviews");
				assert.equal(url.searchParams.get("timezone"), "America/Los_Angeles");
			}
		} finally {
			globalThis.fetch = originalFetch;
		}
	});
});
