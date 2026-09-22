import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { LinkProviderEnvironment } from "../../src/services/link-providers";
import { enrichLinkProvider } from "../../src/services/link-providers";

function html(description: string) {
	return new Response(
		`<html><head><meta property="og:title" content="Profile"><meta property="og:description" content="${description}"></head></html>`,
		{ headers: { "content-type": "text/html" } },
	);
}

function json(value: unknown) {
	return new Response(JSON.stringify(value), {
		headers: { "content-type": "application/json" },
	});
}

function createFetch() {
	return async (input: RequestInfo | URL) => {
		const requestUrl = new URL(input.toString());

		if (requestUrl.hostname === "x.com") {
			return new Response(
				'<html><head><meta property="og:title" content="Profile"></head><script>followers:101909,following:168</script></html>',
				{ headers: { "content-type": "text/html" } },
			);
		}
		if (requestUrl.hostname === "www.instagram.com")
			return html("2M Followers");
		if (requestUrl.hostname === "www.threads.com")
			return html("3.4K Followers");
		if (requestUrl.hostname === "www.tiktok.com") {
			return new Response(
				`<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__">${JSON.stringify({
					__DEFAULT_SCOPE__: {
						"webapp.user-detail": {
							userInfo: { stats: { followerCount: 5678 } },
						},
					},
				})}</script>`,
				{ headers: { "content-type": "text/html" } },
			);
		}
		if (
			requestUrl.hostname === "api.github.com" &&
			requestUrl.pathname === "/users/kinwooky"
		) {
			return json({
				name: "Kin Wooky",
				bio: "Builds products",
				avatar_url: "https://github.com/avatar.png",
				followers: 42,
			});
		}
		if (requestUrl.hostname === "www.googleapis.com") {
			return json({
				items: [
					{
						snippet: {
							title: "Grabbin",
							description: "A product video",
							thumbnails: {
								high: { url: "https://img.youtube.com/thumb.jpg" },
							},
						},
						statistics: {
							subscriberCount: "1234",
							viewCount: "5000",
						},
					},
				],
			});
		}
		if (
			requestUrl.hostname === "discord.com" &&
			requestUrl.pathname === "/api/v10/invites/grabbin"
		) {
			return json({
				guild: { id: "guild-1", name: "Grabbin Community" },
				approximate_member_count: 99,
				approximate_presence_count: 12,
			});
		}
		if (
			requestUrl.hostname === "openapi.chzzk.naver.com" &&
			requestUrl.pathname === "/open/v1/channels"
		) {
			return json({
				content: [
					{
						channelId: "0123456789abcdef0123456789abcdef",
						channelName: "Grabbin Live",
						followerCount: 77,
						channelImageUrl: "https://chzzk.example.com/channel.png",
					},
				],
			});
		}
		if (
			requestUrl.hostname === "api.twitch.tv" &&
			requestUrl.pathname === "/helix/users"
		) {
			return json({
				data: [
					{
						id: "twitch-1",
						display_name: "Kin Wooky",
						description: "Builds live products",
						profile_image_url: "https://twitch.example.com/avatar.png",
					},
				],
			});
		}
		if (
			requestUrl.hostname === "api.twitch.tv" &&
			requestUrl.pathname === "/helix/channels/followers"
		) {
			return json({ total: 88 });
		}
		if (requestUrl.hostname === "api.producthunt.com") {
			return json({
				data: {
					post: {
						name: "Grabbin",
						tagline: "A better link page",
						votesCount: 12,
						thumbnail: { url: "https://producthunt.example.com/thumb.png" },
					},
				},
			});
		}

		return new Response(null, { status: 404 });
	};
}

describe("link provider metadata", () => {
	/**
	 * Case ID: LINK-PROVIDERS-001
	 * Given: representative profile, channel, invite, and product URLs.
	 * When: provider enrichment runs against provider-shaped responses.
	 * Then: every provider-specific count used by the presentation is returned.
	 * Evidence: each expected providerData count matches its fixture.
	 * Result: Pass | Fail | Blocked | Not Run
	 */
	it("LINK-PROVIDERS-001 enriches every provider count", async () => {
		const cases: Array<{
			name: string;
			url: string;
			provider: string;
			key: string;
			expected: number;
			env?: LinkProviderEnvironment;
		}> = [
			{
				name: "X",
				url: "https://twitter.com/kinwooky",
				provider: "x",
				key: "followerCount",
				expected: 101909,
			},
			{
				name: "Instagram",
				url: "https://instagram.com/kinwooky",
				provider: "instagram",
				key: "followerCount",
				expected: 2_000_000,
			},
			{
				name: "Threads",
				url: "https://threads.net/@kinwooky",
				provider: "threads",
				key: "followerCount",
				expected: 3400,
			},
			{
				name: "TikTok",
				url: "https://tiktok.com/@kinwooky",
				provider: "tiktok",
				key: "followerCount",
				expected: 5678,
			},
			{
				name: "GitHub",
				url: "https://github.com/kinwooky",
				provider: "github",
				key: "followers",
				expected: 42,
			},
			{
				name: "YouTube",
				url: "https://youtube.com/@kinwooky",
				provider: "youtube",
				key: "subscriberCount",
				expected: 1234,
				env: { YOUTUBE_API_KEY: "test-key" },
			},
			{
				name: "YouTube Music",
				url: "https://music.youtube.com/@kinwooky",
				provider: "youtube-music",
				key: "subscriberCount",
				expected: 1234,
				env: { YOUTUBE_API_KEY: "test-key" },
			},
			{
				name: "Discord",
				url: "https://discord.gg/grabbin",
				provider: "discord",
				key: "memberCount",
				expected: 99,
			},
			{
				name: "CHZZK",
				url: "https://chzzk.naver.com/0123456789abcdef0123456789abcdef",
				provider: "chzzk",
				key: "followerCount",
				expected: 77,
				env: {
					CHZZK_CLIENT_ID: "test-id",
					CHZZK_CLIENT_SECRET: "test-secret",
				},
			},
			{
				name: "Twitch",
				url: "https://twitch.tv/kinwooky",
				provider: "twitch",
				key: "followerCount",
				expected: 88,
				env: {
					TWITCH_CLIENT_ID: "test-id",
					TWITCH_USER_ACCESS_TOKEN: "test-token",
				},
			},
			{
				name: "Product Hunt",
				url: "https://producthunt.com/products/grabbin",
				provider: "product-hunt",
				key: "upvoteCount",
				expected: 12,
				env: { PRODUCT_HUNT_TOKEN: "test-token" },
			},
		];

		for (const testCase of cases) {
			const metadata = await enrichLinkProvider(new URL(testCase.url), {
				fetch: createFetch(),
				env: testCase.env,
			});
			assert.equal(metadata.provider, testCase.provider, testCase.name);
			assert.equal(
				metadata.providerData?.[testCase.key],
				testCase.expected,
				testCase.name,
			);
		}
	});
});
