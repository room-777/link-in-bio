import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { fetchRssFeed } from "../../../src/services/rss/rss.service";

describe("RSS service", () => {
	/**
	 * Case ID: RSS-SERVICE-001
	 * Given: a supported RSS URL includes a query and fragment.
	 * When: fetchRssFeed resolves and loads its feed.
	 * Then: the response keeps the submitted URL and requests the platform feed URL.
	 * Evidence: response source.inputUrl and captured fetch URL.
	 * Result: Pass | Fail | Blocked | Not Run
	 */
	it("RSS-SERVICE-001 keeps the submitted URL in the response", async () => {
		const inputUrl = "https://www.medium.com/@author?source=profile#latest";
		let requestedUrl = "";
		const result = await fetchRssFeed({
			url: inputUrl,
			fetch: async (input) => {
				requestedUrl = String(input);
				return new Response(
					'<rss version="2.0"><channel><title>Author</title><link>https://medium.com/@author</link><description>Author feed</description></channel></rss>',
					{ status: 200 },
				);
			},
		});

		assert.equal(result.source.inputUrl, inputUrl);
		assert.equal(result.source.pageUrl, "https://medium.com/@author");
		assert.equal(requestedUrl, "https://medium.com/feed/@author");
	});

	/**
	 * Case ID: RSS-SERVICE-002
	 * Given: a supported platform RSS endpoint is submitted directly.
	 * When: fetchRssFeed resolves and loads the feed.
	 * Then: the response includes its page URL while the original RSS endpoint is fetched.
	 * Evidence: response source.pageUrl and captured fetch URL for each platform.
	 * Result: Pass | Fail | Blocked | Not Run
	 */
	it("RSS-SERVICE-002 maps supported RSS endpoints to their page URLs", async () => {
		const cases = [
			["https://medium.com/feed/@author", "https://medium.com/@author"],
			["https://medium.com/feed/publication", "https://medium.com/publication"],
			[
				"https://publication.substack.com/feed",
				"https://publication.substack.com/",
			],
			["https://note.com/author/rss", "https://note.com/author"],
			[
				"https://note.com/magazine/m/magazine-id/rss",
				"https://note.com/magazine/m/magazine-id",
			],
			["https://blog.ghost.io/rss/", "https://blog.ghost.io/"],
			[
				"https://blog.ghost.io/author/alex/rss/",
				"https://blog.ghost.io/author/alex",
			],
			["https://blog.hashnode.dev/rss.xml", "https://blog.hashnode.dev/"],
		] as const;

		for (const [inputUrl, pageUrl] of cases) {
			let requestedUrl = "";
			const result = await fetchRssFeed({
				url: inputUrl,
				fetch: async (input) => {
					requestedUrl = String(input);
					return new Response(
						'<rss version="2.0"><channel><title>Author</title><link>https://medium.com/@author</link><description>Author feed</description></channel></rss>',
						{ status: 200 },
					);
				},
			});

			assert.equal(result.source.inputUrl, inputUrl);
			assert.equal(result.source.pageUrl, pageUrl);
			assert.equal(requestedUrl, inputUrl);
		}
	});
});
