import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { listSitemapHandles } from "@grabbin/application/page-lifecycle";
import type { DatabaseClient } from "@grabbin/db";

describe("page lifecycle service", () => {
	/**
	 * Case ID: PAGE-SITEMAP-SERVICE-001
	 * Given: the query returns public pages, including a draft, a reserved handle, and a placeholder profile.
	 * When: sitemap handles are listed.
	 * Then: drafts remain eligible, while reserved handles and placeholder profiles are omitted.
	 * Evidence: returned handles and the rendered Drizzle filter.
	 * Result: Pass | Fail | Blocked | Not Run
	 */
	it("PAGE-SITEMAP-SERVICE-001 includes useful public handles", async () => {
		let queryOptions: Record<string, unknown> | undefined;
		const db = {
			query: {
				pages: {
					findMany: async (options: Record<string, unknown>) => {
						queryOptions = options;
						return [
							{ handle: "avery", bio: "A creator and photographer." },
							{ handle: "create", bio: null },
							{ handle: "jordan", bio: "A designer in Seoul." },
							{ handle: "test", bio: "Lorem Ipsum is placeholder text." },
						];
					},
				},
			},
		} as unknown as DatabaseClient;

		assert.deepEqual(await listSitemapHandles(db), ["avery", "jordan"]);
		assert.deepEqual(queryOptions?.columns, { handle: true, bio: true });
		assert.equal(queryOptions?.where, undefined);
		assert.ok(queryOptions?.orderBy);
	});
});
