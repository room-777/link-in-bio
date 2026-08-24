import {
	describe,
	expect,
	it,
} from "bun:test";
import type { TwitchUserToken } from "./link-providers";
import { createTwitchEnricher } from "./twitch-link-provider";

const env = {
	TWITCH_CLIENT_ID: "client-id",
	TWITCH_CLIENT_SECRET: "client-secret",
	TWITCH_USER_ACCESS_TOKEN:
		"user-token",
};

describe("twitch link provider", () => {
	it("extracts followers, live data, and the latest VOD through Helix", async () => {
		const requests: URL[] = [];
		const enrich = createTwitchEnricher(
			async () => ({
				title: "fallback",
			}),
		);

		const metadata = await enrich(
			new URL(
				"https://www.twitch.tv/creator",
			),
			{
				env,
				fetch: async (input, init) => {
					const requestUrl = new URL(
						String(input),
					);
					requests.push(requestUrl);

					if (
						requestUrl.hostname ===
						"id.twitch.tv"
					) {
						expect(init?.method).toBe(
							"POST",
						);
						return new Response(
							JSON.stringify({
								access_token:
									"app-token",
								expires_in: 3600,
							}),
							{
								headers: {
									"content-type":
										"application/json",
								},
							},
						);
					}

					if (
						requestUrl.pathname ===
						"/helix/users"
					) {
						expect(
							requestUrl.searchParams.get(
								"login",
							),
						).toBe("creator");
						return new Response(
							JSON.stringify({
								data: [
									{
										id: "123",
										login: "creator",
										display_name:
											"Creator",
										description:
											"Creator channel",
										profile_image_url:
											"https://static.example.com/profile.jpg",
									},
								],
							}),
							{
								headers: {
									"content-type":
										"application/json",
								},
							},
						);
					}

					if (
						requestUrl.pathname ===
						"/helix/channels/followers"
					) {
						expect(
							requestUrl.searchParams.get(
								"moderator_id",
							),
						).toBeNull();
						expect(
							init?.headers,
						).toMatchObject({
							Authorization:
								"Bearer user-token",
						});
						return new Response(
							JSON.stringify({
								total: 420,
								data: [],
							}),
							{
								headers: {
									"content-type":
										"application/json",
								},
							},
						);
					}

					if (
						requestUrl.pathname ===
						"/helix/streams"
					) {
						return new Response(
							JSON.stringify({
								data: [
									{
										title: "Live now",
										viewer_count: 1234,
										thumbnail_url:
											"https://static.example.com/live-{width}x{height}.jpg",
									},
								],
							}),
							{
								headers: {
									"content-type":
										"application/json",
								},
							},
						);
					}

					expect(
						requestUrl.pathname,
					).toBe("/helix/videos");
					return new Response(
						JSON.stringify({
							data: [
								{
									id: "vod123",
									title: "Latest VOD",
									created_at:
										"2026-07-31T00:00:00Z",
									thumbnail_url:
										"https://static.example.com/vod-{width}x{height}.jpg",
								},
							],
						}),
						{
							headers: {
								"content-type":
									"application/json",
							},
						},
					);
				},
			},
		);

		expect(requests).toHaveLength(5);
		expect(metadata).toEqual({
			title: "Creator",
			description: "Creator channel",
			imageUrl:
				"https://static.example.com/live-640x360.jpg",
			providerData: {
				channelId: "123",
				profileImageUrl:
					"https://static.example.com/profile.jpg",
				followerCount: 420,
				isLive: true,
				viewerCount: 1234,
				liveTitle: "Live now",
				liveThumbnailUrl:
					"https://static.example.com/live-640x360.jpg",
				recentVideoId: "vod123",
				recentVideoTitle: "Latest VOD",
				recentVideoThumbnailUrl:
					"https://static.example.com/vod-640x360.jpg",
				recentVideoPublishedAt:
					"2026-07-31T00:00:00Z",
				recentVideoUrl:
					"https://www.twitch.tv/videos/vod123",
			},
		});
	});

	it("refreshes the user token after Helix returns 401", async () => {
		let storedToken: TwitchUserToken = {
			accessToken: "expired-user-token",
			refreshToken: "old-refresh-token",
		};
		let followerRequestCount = 0;
		const requests: URL[] = [];
		const enrich = createTwitchEnricher(
			async () => ({
				title: "fallback",
			}),
		);

		const metadata = await enrich(
			new URL(
				"https://www.twitch.tv/creator",
			),
			{
				env: {
					...env,
					TWITCH_CLIENT_ID:
						"refresh-client-id",
				},
				twitchUserTokenStore: {
					get: async () => storedToken,
					set: async (token) => {
						storedToken = token;
					},
				},
				fetch: async (input, init) => {
					const requestUrl = new URL(
						String(input),
					);
					requests.push(requestUrl);

					if (
						requestUrl.hostname ===
						"id.twitch.tv"
					) {
						const body = String(
							init?.body,
						);
						if (
							body.includes(
								"grant_type=refresh_token",
							)
						) {
							expect(body).toContain(
								"refresh_token=old-refresh-token",
							);
							return new Response(
								JSON.stringify({
									access_token:
										"new-user-token",
									refresh_token:
										"new-refresh-token",
									expires_in: 3600,
								}),
								{
									headers: {
										"content-type":
											"application/json",
									},
								},
							);
						}

						return new Response(
							JSON.stringify({
								access_token:
									"app-token",
								expires_in: 3600,
							}),
							{
								headers: {
									"content-type":
										"application/json",
								},
							},
						);
					}

					if (
						requestUrl.pathname ===
						"/helix/users"
					) {
						return new Response(
							JSON.stringify({
								data: [
									{
										id: "123",
										login: "creator",
										display_name:
											"Creator",
									},
								],
							}),
							{
								headers: {
									"content-type":
										"application/json",
								},
							},
						);
					}

					if (
						requestUrl.pathname ===
						"/helix/channels/followers"
					) {
						const authorization = (
							init?.headers as Record<
								string,
								string
							>
						).Authorization;
						followerRequestCount += 1;
						if (
							followerRequestCount === 1
						) {
							expect(
								authorization,
							).toBe(
								"Bearer expired-user-token",
							);
							return new Response(
								null,
								{
									status: 401,
								},
							);
						}
						expect(authorization).toBe(
							"Bearer new-user-token",
						);
						return new Response(
							JSON.stringify({
								total: 9001,
								data: [],
							}),
							{
								headers: {
									"content-type":
										"application/json",
								},
							},
						);
					}

					return new Response(
						JSON.stringify({
							data: [],
						}),
						{
							headers: {
								"content-type":
									"application/json",
							},
						},
					);
				},
			},
		);

		expect(followerRequestCount).toBe(
			2,
		);
		expect(storedToken).toMatchObject({
			accessToken: "new-user-token",
			refreshToken: "new-refresh-token",
		});
		expect(
			metadata.providerData,
		).toMatchObject({
			followerCount: 9001,
		});
		expect(
			requests.filter(
				(request) =>
					request.hostname ===
					"id.twitch.tv",
			).length,
		).toBe(2);
	});

	it("falls back when Twitch credentials are unavailable", async () => {
		let fallbackCalled = false;
		const enrich = createTwitchEnricher(
			async () => {
				fallbackCalled = true;
				return { title: "fallback" };
			},
		);

		await enrich(
			new URL(
				"https://www.twitch.tv/creator",
			),
			{
				fetch: async () => {
					throw new Error(
						"missing credentials should not fetch",
					);
				},
			},
		);

		expect(fallbackCalled).toBe(true);
	});
});
