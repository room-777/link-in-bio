import {
	describe,
	expect,
	it,
} from "bun:test";
import { createYoutubeEnricher } from "./youtube-link-provider";

const env = {
	YOUTUBE_API_KEY: "youtube-key",
};

describe("youtube link provider", () => {
	it("extracts channel statistics and the latest upload through the Data API", async () => {
		const requests: URL[] = [];
		const enrich =
			createYoutubeEnricher(
				async () => ({
					title: "fallback",
				}),
			);

		const metadata = await enrich(
			new URL(
				"https://www.youtube.com/@creator",
			),
			{
				env,
				fetch: async (input) => {
					const requestUrl = new URL(
						String(input),
					);
					requests.push(requestUrl);

					if (
						requestUrl.pathname ===
						"/youtube/v3/channels"
					) {
						expect(
							requestUrl.searchParams.get(
								"part",
							),
						).toBe(
							"contentDetails,snippet,statistics",
						);
						expect(
							requestUrl.searchParams.get(
								"forHandle",
							),
						).toBe("creator");
						expect(
							requestUrl.searchParams.get(
								"key",
							),
						).toBe("youtube-key");
						return new Response(
							JSON.stringify({
								items: [
									{
										id: "UCcreator",
										snippet: {
											title: "Creator",
											description:
												"Creator channel",
											thumbnails: {
												medium: {
													url: "https://yt.example/avatar.jpg",
												},
											},
										},
										statistics: {
											subscriberCount:
												"1234",
											videoCount: "87",
											viewCount:
												"98765",
										},
										contentDetails: {
											relatedPlaylists:
												{
													uploads:
														"UUcreator",
												},
										},
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
					).toBe(
						"/youtube/v3/playlistItems",
					);
					expect(
						requestUrl.searchParams.get(
							"playlistId",
						),
					).toBe("UUcreator");
					expect(
						requestUrl.searchParams.get(
							"maxResults",
						),
					).toBe("4");
					return new Response(
						JSON.stringify({
							items: [
								{
									snippet: {
										publishedAt:
											"2026-07-31T00:00:00Z",
										title:
											"Latest video",
										resourceId: {
											videoId:
												"latest123",
										},
										thumbnails: {
											high: {
												url: "https://i.ytimg.com/latest.jpg",
											},
										},
									},
								},
								{
									snippet: {
										publishedAt:
											"2026-07-30T00:00:00Z",
										title:
											"Second video",
										resourceId: {
											videoId:
												"second123",
										},
										thumbnails: {
											high: {
												url: "https://i.ytimg.com/second.jpg",
											},
										},
									},
								},
								{
									snippet: {
										publishedAt:
											"2026-07-29T00:00:00Z",
										title:
											"Third video",
										resourceId: {
											videoId:
												"third123",
										},
										thumbnails: {
											high: {
												url: "https://i.ytimg.com/third.jpg",
											},
										},
									},
								},
								{
									snippet: {
										publishedAt:
											"2026-07-28T00:00:00Z",
										title:
											"Fourth video",
										resourceId: {
											videoId:
												"fourth123",
										},
										thumbnails: {
											high: {
												url: "https://i.ytimg.com/fourth.jpg",
											},
										},
									},
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

		expect(requests).toHaveLength(2);
		expect(metadata).toEqual({
			title: "Creator",
			description: "Creator channel",
			imageUrl:
				"https://i.ytimg.com/latest.jpg",
			providerData: {
				channelId: "UCcreator",
				channelImageUrl:
					"https://yt.example/avatar.jpg",
				subscriberCount: 1234,
				videoCount: 87,
				viewCount: 98765,
				recentVideoId: "latest123",
				recentVideoTitle:
					"Latest video",
				recentVideoThumbnailUrl:
					"https://i.ytimg.com/latest.jpg",
				recentVideoThumbnailUrls: [
					"https://i.ytimg.com/latest.jpg",
					"https://i.ytimg.com/second.jpg",
					"https://i.ytimg.com/third.jpg",
					"https://i.ytimg.com/fourth.jpg",
				],
				recentVideoPublishedAt:
					"2026-07-31T00:00:00Z",
				recentVideoUrl:
					"https://www.youtube.com/watch?v=latest123",
			},
		});
	});

	it("uses the Data API for video URLs", async () => {
		const enrich =
			createYoutubeEnricher(
				async () => ({
					title: "fallback",
				}),
			);

		const metadata = await enrich(
			new URL(
				"https://youtu.be/video123",
			),
			{
				env,
				fetch: async (input) => {
					const requestUrl = new URL(
						String(input),
					);
					expect(
						requestUrl.pathname,
					).toBe("/youtube/v3/videos");
					expect(
						requestUrl.searchParams.get(
							"id",
						),
					).toBe("video123");
					return new Response(
						JSON.stringify({
							items: [
								{
									id: "video123",
									snippet: {
										title:
											"Video title",
										description:
											"Video description",
										channelId:
											"UCcreator",
										channelTitle:
											"Creator",
										publishedAt:
											"2026-07-30T00:00:00Z",
										thumbnails: {
											maxres: {
												url: "https://i.ytimg.com/video.jpg",
											},
										},
									},
									statistics: {
										viewCount: "100",
										likeCount: "10",
										commentCount: "2",
									},
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

		expect(metadata).toEqual({
			title: "Video title",
			description: "Video description",
			imageUrl:
				"https://i.ytimg.com/video.jpg",
			providerData: {
				channelId: "UCcreator",
				channelTitle: "Creator",
				viewCount: 100,
				likeCount: 10,
				commentCount: 2,
				publishedAt:
					"2026-07-30T00:00:00Z",
			},
		});
	});

	it("falls back for unsupported channel URL forms", async () => {
		let fallbackCalled = false;
		const enrich =
			createYoutubeEnricher(
				async () => {
					fallbackCalled = true;
					return {
						title: "Custom channel",
					};
				},
			);

		await enrich(
			new URL(
				"https://www.youtube.com/c/custom",
			),
			{
				fetch: async () => {
					throw new Error(
						"unsupported channel should use fallback",
					);
				},
			},
		);

		expect(fallbackCalled).toBe(true);
	});
});
