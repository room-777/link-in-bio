import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { DatabaseClient } from "@grabbin/db";

import { PageItemServiceError } from "../../src/exceptions/page-item.exception";
import { enrichPageItemMetadata } from "../../src/services/link-metadata.service";
import { LINK_METADATA_USER_AGENTS } from "../../src/services/link-providers/runtime";

const layout = { x: 0, y: 0, w: 1, h: 2 };

function createDatabase(url = "https://example.com") {
	const now = new Date("2026-09-21T00:00:00.000Z");
	const current = {
		id: "item-1",
		pageId: "page-1",
		type: "link",
		data: { url },
		style: {},
		layouts: { wide: layout, compact: layout },
		createdAt: now,
		updatedAt: now,
	};
	const db = {
		query: {
			pages: { findFirst: async () => ({ id: "page-1" }) },
			pageItems: {
				findFirst: async () => current,
			},
		},
		update: () => ({
			set(values: Record<string, unknown>) {
				Object.assign(current, values, { updatedAt: now });
				return {
					where: async () => undefined,
				};
			},
		}),
	} as unknown as DatabaseClient;
	return { db, current };
}

describe("link metadata service", () => {
	it("LINK-METADATA-SERVICE-001 stores safe Open Graph metadata", async () => {
		const { db, current } = createDatabase();
		let userAgent: string | null = null;
		const result = await enrichPageItemMetadata({
			db,
			handle: "jane",
			userId: "user-1",
			itemId: "item-1",
			url: "https://example.com",
			fetch: async (_input, init) => {
				userAgent = new Headers(init?.headers).get("User-Agent");
				return new Response(
					'<html><head><link rel="icon" href="/favicon.svg"><title> Example </title><meta name="description" content="A page"><meta property="og:image" content="https://cdn.example.com/card.png"></head></html>',
					{ headers: { "content-type": "text/html" } },
				);
			},
		});

		assert.ok(
			userAgent &&
				(LINK_METADATA_USER_AGENTS as readonly string[]).includes(userAgent),
		);
		assert.equal(result.type, "link");
		if (result.type !== "link") return;
		assert.equal(result.data.metadata?.title, "Example");
		assert.equal(result.data.metadata?.description, "A page");
		assert.equal(
			result.data.metadata?.imageUrl,
			"https://cdn.example.com/card.png",
		);
		assert.equal(
			result.data.metadata?.faviconUrl,
			"https://example.com/favicon.svg",
		);
		assert.deepEqual(current.data, {
			url: "https://example.com",
			metadata: {
				title: "Example",
				description: "A page",
				imageUrl: "https://cdn.example.com/card.png",
				faviconUrl: "https://example.com/favicon.svg",
				provider: "generic-web",
			},
		});
	});

	it("LINK-METADATA-SERVICE-002 ignores stale URL refreshes", async () => {
		const { db } = createDatabase();
		let fetchCalls = 0;

		await assert.rejects(
			enrichPageItemMetadata({
				db,
				handle: "jane",
				userId: "user-1",
				itemId: "item-1",
				url: "https://other.example.com",
				fetch: async () => {
					fetchCalls += 1;
					return new Response();
				},
			}),
			(error: unknown) =>
				error instanceof PageItemServiceError &&
				error.code === "STALE_LINK_METADATA",
		);
		assert.equal(fetchCalls, 0);
	});

	/**
	 * Case ID: LINK-METADATA-SERVICE-003
	 * Given: an X profile link whose HTML contains its follower count.
	 * When: the metadata refresh endpoint enriches the saved item.
	 * Then: it stores X provider data after fetching the page only once.
	 * Evidence: followerCount=101909, actionDetail=101.9K, and one fetch call.
	 * Result: Pass | Fail | Blocked | Not Run
	 */
	it("LINK-METADATA-SERVICE-003 stores X profile follower metadata", async () => {
		const { db, current } = createDatabase("https://twitter.com/kinwooky");
		const html =
			'<html><head><meta property="og:title" content="Kin Wooky"><meta property="og:description" content="Kin Wooky profile"><script>followers:101909,following:168</script></head></html>';
		let fetchCalls = 0;

		const result = await enrichPageItemMetadata({
			db,
			handle: "jane",
			userId: "user-1",
			itemId: "item-1",
			url: "https://twitter.com/kinwooky",
			fetch: async () => {
				fetchCalls += 1;
				return new Response(html, {
					headers: { "content-type": "text/html" },
				});
			},
		});

		assert.equal(fetchCalls, 1);
		assert.equal(result.type, "link");
		if (result.type !== "link") return;
		assert.equal(result.data.metadata?.provider, "x");
		assert.equal(result.data.metadata?.providerData?.followerCount, 101909);
		assert.equal(result.data.metadata?.presentation?.actionDetail, "101.9K");
		assert.deepEqual(current.data, {
			url: "https://twitter.com/kinwooky",
			metadata: {
				title: "Kin Wooky",
				description: "Kin Wooky profile",
				provider: "x",
				providerData: {
					followerCount: 101909,
					followerCountLabel: "101909",
					followerCountApproximate: false,
				},
			},
		});
	});

	/**
	 * Case ID: LINK-METADATA-SERVICE-007
	 * Given: a TikTok or Threads profile link.
	 * When: generic and provider metadata are extracted together.
	 * Then: each profile page is fetched once.
	 * Evidence: fetch call count is one for both providers.
	 * Result: Pass | Fail | Blocked | Not Run
	 */
	it("LINK-METADATA-SERVICE-007 fetches each social profile page once", async () => {
		for (const url of [
			"https://www.tiktok.com/@kinwooky",
			"https://www.threads.com/@kinwooky",
		]) {
			const { db } = createDatabase(url);
			let fetchCalls = 0;
			await enrichPageItemMetadata({
				db,
				handle: "jane",
				userId: "user-1",
				itemId: "item-1",
				url,
				fetch: async () => {
					fetchCalls += 1;
					return new Response(
						'<html><head><meta property="og:title" content="Profile"></head></html>',
						{ headers: { "content-type": "text/html" } },
					);
				},
			});
			assert.equal(fetchCalls, 1, url);
		}
	});

	it("LINK-METADATA-SERVICE-004 falls back to regular HTML metadata when SOOP API fails", async () => {
		const url = "https://www.sooplive.com/station/devil0108";
		const { db, current } = createDatabase(url);
		const result = await enrichPageItemMetadata({
			db,
			handle: "jane",
			userId: "user-1",
			itemId: "item-1",
			url,
			fetch: async (input) => {
				if (new URL(input.toString()).hostname === "api-channel.sooplive.com")
					throw new Error("SOOP API unavailable");
				return new Response(
					'<html><head><meta property="og:title" content="SOOP station"><meta property="og:image" content="https://cdn.example.com/soop.png"></head></html>',
					{ headers: { "content-type": "text/html" } },
				);
			},
		});

		assert.equal(result.type, "link");
		if (result.type !== "link") return;
		assert.equal(result.data.metadata?.title, "SOOP station");
		assert.equal(
			result.data.metadata?.imageUrl,
			"https://cdn.example.com/soop.png",
		);
		assert.equal(result.data.metadata?.provider, "soop");
		assert.equal(result.data.metadata?.presentation?.actionLabel, "Watch");
		assert.deepEqual(current.data, {
			url,
			metadata: {
				title: "SOOP station",
				imageUrl: "https://cdn.example.com/soop.png",
				provider: "soop",
			},
		});
	});

	/**
	 * Case ID: LINK-METADATA-SERVICE-005
	 * Given: generic and Instagram metadata both need the profile HTML.
	 * When: the metadata refresh runs both enrichers.
	 * Then: it fetches the profile once and stores both metadata results.
	 * Evidence: fetch call count and stored provider metadata.
	 * Result: Pass | Fail | Blocked | Not Run
	 */
	it("LINK-METADATA-SERVICE-005 shares concurrent requests for the same page", async () => {
		const url = "https://www.instagram.com/officialstellive/";
		const { db } = createDatabase(url);
		let fetchCalls = 0;

		const result = await enrichPageItemMetadata({
			db,
			handle: "jane",
			userId: "user-1",
			itemId: "item-1",
			url,
			fetch: async (_input) => {
				fetchCalls += 1;
				return new Response(
					'<html><head><meta property="og:title" content="Stellive"></head><body><a href="/officialstellive/p/post-1/"><img src="https://cdn.example.com/post.png"></a></body></html>',
					{ headers: { "content-type": "text/html" } },
				);
			},
		});

		assert.equal(fetchCalls, 1);
		assert.equal(result.type, "link");
		if (result.type === "link") {
			assert.equal(result.data.metadata?.provider, "instagram");
			assert.equal(result.data.metadata?.title, "Stellive");
		}
	});

	/**
	 * Case ID: LINK-METADATA-SERVICE-006
	 * Given: the target site responds with HTTP 429 and Retry-After.
	 * When: the metadata refresh runs.
	 * Then: it raises a rate-limit error with the upstream retry delay.
	 * Evidence: error code, Retry-After value, and one fetch call.
	 * Result: Pass | Fail | Blocked | Not Run
	 */
	it("LINK-METADATA-SERVICE-006 reports upstream rate limits and Retry-After", async () => {
		const url = "https://www.instagram.com/officialstellive/";
		const { db } = createDatabase(url);
		let fetchCalls = 0;

		await assert.rejects(
			enrichPageItemMetadata({
				db,
				handle: "jane",
				userId: "user-1",
				itemId: "item-1",
				url,
				fetch: async () => {
					fetchCalls += 1;
					return new Response("Rate limited", {
						status: 429,
						headers: { "Retry-After": "120" },
					});
				},
			}),
			(error: unknown) =>
				error instanceof PageItemServiceError &&
				error.code === "UPSTREAM_RATE_LIMITED" &&
				error.retryAfter === "120",
		);
		assert.equal(fetchCalls, 1);
	});
});
