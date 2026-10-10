import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { normalizeProviderData } from "@grabbin/api";
import type { DatabaseClient } from "@grabbin/db";
import { resolveLinkMetadata } from "@grabbin/page-link";

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
				providerData: normalizeProviderData({}),
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
				providerData: normalizeProviderData({
					followerCount: 101909,
					followerCountLabel: "101909",
					followerCountApproximate: false,
				}),
			},
		});
	});

	/**
	 * Case ID: LINK-METADATA-SERVICE-007
	 * Given: supported social profile links.
	 * When: generic and provider metadata are extracted together.
	 * Then: Instagram uses only its private API, while other previews use HTML.
	 * Evidence: request count and User-Agent for each social host.
	 * Result: Pass | Fail | Blocked | Not Run
	 */
	it("LINK-METADATA-SERVICE-007 fetches social profiles with preview metadata", async () => {
		for (const url of [
			"https://www.instagram.com/kinwooky",
			"https://www.tiktok.com/@kinwooky",
			"https://www.threads.com/@kinwooky",
			"https://www.facebook.com/kinwooky",
			"https://www.linkedin.com/company/kinwooky",
			"https://x.com/kinwooky",
		]) {
			const { db } = createDatabase(url);
			const requested: Array<{
				url: URL;
				userAgent: string | null;
			}> = [];
			const result = await enrichPageItemMetadata({
				db,
				handle: "jane",
				userId: "user-1",
				itemId: "item-1",
				url,
				fetch: async (_input, init) => {
					const requestUrl = new URL(_input.toString());
					requested.push({
						url: requestUrl,
						userAgent: new Headers(init?.headers).get("User-Agent"),
					});
					if (requestUrl.pathname.includes("web_profile_info")) {
						return new Response("Rate limited", { status: 429 });
					}
					return new Response(
						'<html><head><meta property="og:title" content="Profile"></head></html>',
						{ headers: { "content-type": "text/html" } },
					);
				},
			});
			assert.equal(result.type, "link", url);
			const isInstagram = new URL(url).hostname.endsWith("instagram.com");
			assert.equal(requested.length, isInstagram ? 0 : 1, url);
			const profileRequest = requested.find(
				({ url: requestUrl }) =>
					!requestUrl.pathname.includes("web_profile_info"),
			);
			if (isInstagram) {
				assert.equal(profileRequest, undefined, url);
			} else if (new URL(url).hostname.endsWith("tiktok.com")) {
				assert.match(
					profileRequest?.userAgent ?? "",
					/Chrome\/120\.0\.0\.0/,
					url,
				);
			} else {
				assert.equal(profileRequest?.userAgent, "facebookexternalhit/1.1", url);
			}
		}
	});

	it("stores Facebook and LinkedIn follower counts as provider data", async () => {
		for (const [
			url,
			description,
			expected,
			actionDetail,
			talkingAboutCount,
		] of [
			[
				"https://www.facebook.com/grabbin",
				"Grabbin. 68,226,899 followers · 434,467 talking about this.",
				68_226_899,
				"68.2M",
				434_467,
			],
			[
				"https://www.linkedin.com/company/grabbin",
				"11,903,900 followers on LinkedIn.",
				11_903_900,
				"11.9M",
				null,
			],
		] as const) {
			const { db } = createDatabase(url);
			const result = await enrichPageItemMetadata({
				db,
				handle: "jane",
				userId: "user-1",
				itemId: "item-1",
				url,
				fetch: async () =>
					new Response(
						`<html><head><meta property="og:description" content="${description}"></head></html>`,
						{ headers: { "content-type": "text/html" } },
					),
			});
			assert.equal(result.type, "link", url);
			if (result.type === "link")
				assert.equal(
					result.data.metadata?.providerData?.followerCount,
					expected,
				);
			if (result.type === "link")
				assert.equal(
					resolveLinkMetadata(url, result.data.metadata).presentation
						.actionDetail,
					actionDetail,
				);
			if (result.type === "link")
				assert.equal(
					result.data.metadata?.providerData?.talkingAboutCount,
					talkingAboutCount,
				);
		}
	});

	it("uses only Discord's official invite endpoint and stores its counts", async () => {
		const url = "https://discord.gg/grabbin";
		const { db } = createDatabase(url);
		const requested: Array<{ url: URL; headers: Headers }> = [];
		const result = await enrichPageItemMetadata({
			db,
			handle: "jane",
			userId: "user-1",
			itemId: "item-1",
			url,
			fetch: async (input, init) => {
				const requestUrl = new URL(input.toString());
				requested.push({
					url: requestUrl,
					headers: new Headers(init?.headers),
				});
				return new Response(
					JSON.stringify({
						guild: { id: "guild-1", name: "Grabbin" },
						approximate_member_count: 55,
						approximate_presence_count: 12,
					}),
					{ headers: { "content-type": "application/json" } },
				);
			},
		});
		assert.equal(result.type, "link");
		assert.equal(requested.length, 1);
		assert.equal(requested[0]?.url.hostname, "discord.com");
		assert.equal(requested[0]?.url.pathname, "/api/v10/invites/grabbin");
		assert.equal(
			requested[0]?.headers.get("User-Agent"),
			"Grabbin (https://grabbin.me, 1.0)",
		);
		if (result.type === "link")
			assert.equal(result.data.metadata?.providerData?.memberCount, 55);
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
				providerData: normalizeProviderData({}),
			},
		});
	});

	/**
	 * Case ID: LINK-METADATA-SERVICE-005
	 * Given: an authenticated Instagram profile URL.
	 * When: the metadata refresh runs the provider enricher.
	 * Then: it fetches only the authenticated private profile endpoint.
	 * Evidence: one private endpoint request and stored provider metadata.
	 * Result: Pass | Fail | Blocked | Not Run
	 */
	it("LINK-METADATA-SERVICE-005 shares concurrent requests for the same page", async () => {
		const url = "https://www.instagram.com/officialstellive/";
		const { db } = createDatabase(url);
		const requestedUrls: URL[] = [];

		const result = await enrichPageItemMetadata({
			db,
			handle: "jane",
			userId: "user-1",
			itemId: "item-1",
			url,
			fetch: async (input) => {
				requestedUrls.push(new URL(input.toString()));
				return new Response(
					JSON.stringify({
						data: {
							user: {
								username: "officialstellive",
								full_name: "Stellive",
								follower_count: 1234,
							},
						},
					}),
					{ headers: { "content-type": "application/json" } },
				);
			},
			env: { INSTAGRAM_SESSION_ID: `123%3A${"a".repeat(64)}` },
		});

		assert.equal(requestedUrls.length, 1);
		assert.equal(requestedUrls[0]?.hostname, "i.instagram.com");
		assert.equal(result.type, "link");
		if (result.type === "link")
			assert.equal(result.data.metadata?.providerData?.followerCount, 1234);
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
		const url = "https://example.com/officialstellive/";
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
