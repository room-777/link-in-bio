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
	 * Then: it stores the X provider data used by the public presentation.
	 * Evidence: followerCount=101909 and actionDetail=101.9K.
	 * Result: Pass | Fail | Blocked | Not Run
	 */
	it("LINK-METADATA-SERVICE-003 stores X profile follower metadata", async () => {
		const { db, current } = createDatabase("https://twitter.com/kinwooky");
		const html =
			'<html><head><meta property="og:title" content="Kin Wooky"><meta property="og:description" content="Kin Wooky profile"><script>followers:101909,following:168</script></head></html>';

		const result = await enrichPageItemMetadata({
			db,
			handle: "jane",
			userId: "user-1",
			itemId: "item-1",
			url: "https://twitter.com/kinwooky",
			fetch: async () =>
				new Response(html, { headers: { "content-type": "text/html" } }),
		});

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
});
