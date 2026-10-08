import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	providerDefinitionList,
	resolveLinkMetadata,
	resolveLinkProvider,
} from "@grabbin/page-link";

import type { LinkProviderEnvironment } from "../../src/services/link-providers";
import { enrichLinkProvider } from "../../src/services/link-providers";

const providerIconBaseUrl = "/api/provider-icons";

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

		if (requestUrl.hostname === "dribbble.com") {
			if (requestUrl.pathname === "/shots/27791477-AI-Mental-Health-Platform") {
				return new Response(
					'<html><head><meta property="og:title" content="AI Mental Health Platform by NexUX Product for NexUX Lab on Dribbble"><meta property="og:description" content="An AI mental health platform."><meta property="og:image" content="https://cdn.dribbble.com/shot.png"></head><body><a href="/nexuxproduct"><img class="profile-avatar" alt="NexUX Product" src="https://cdn.dribbble.com/creator.png"></a><a href="/nexuxlab">NexUX Lab</a></body></html>',
					{ headers: { "content-type": "text/html" } },
				);
			}
			if (requestUrl.pathname === "/nexuxproduct") {
				return new Response(
					'<html><head><title>NexUX Product</title></head><body><img class="profile-avatar" alt="NexUX Product" src="https://cdn.dribbble.com/creator.png"></body></html>',
					{ headers: { "content-type": "text/html" } },
				);
			}
			if (requestUrl.pathname === "/nexuxlab") {
				return new Response(
					`<html><head><meta property="og:title" content="NexUX Lab"></head><body><img class="profile-avatar" alt="NexUX Lab" src="https://cdn.dribbble.com/team.png">254 followers 337 following 1,750 likes${Array.from(
						{ length: 5 },
						(_, index) =>
							`<li class="shot-thumbnail" id="screenshot-${100 - index}"><img src="https://cdn.dribbble.com/shot-${index}.png"><a href="/shots/${100 - index}-recent-shot-${index}">View shot</a></li>`,
					).join("")}</body></html>`,
					{ headers: { "content-type": "text/html" } },
				);
			}
		}

		if (requestUrl.hostname === "www.behance.net") {
			if (requestUrl.pathname.startsWith("/embed/project/")) {
				return new Response(
					'<html><head><title>Portfolio Project :: Behance</title><meta name="description" content="Behance is the world&#039;s largest creative network for showcasing and discovering creative work"></head><body><img alt="Project Cover: Portfolio Project" srcset="https://mir-s3-cdn-cf.behance.net/project-small.jpg 115w, https://mir-s3-cdn-cf.behance.net/project-cover.jpg 808w"><img alt="Anna Krupkin&#39;s profile" src="https://pps.services.adobe.com/anna.jpg" srcset="https://pps.services.adobe.com/anna.jpg 50w"></body></html>',
					{ headers: { "content-type": "text/html" } },
				);
			}
			return new Response(
				`<html><head><meta property="og:title" content="Artist Profile"><meta property="og:description" content="Graphic designer"></head><body>2.4M Followers${Array.from(
					{ length: 4 },
					(_, index) =>
						`<article><a href="/gallery/${index + 1}/project-${index + 1}"><picture><source srcset="https://mir-s3-cdn-cf.behance.net/projects/thumb-${index + 1}.webp 808w"></picture></a></article>`,
				).join("")}</body></html>`,
				{ headers: { "content-type": "text/html" } },
			);
		}
		if (requestUrl.hostname.endsWith("pinterest.com")) {
			if (requestUrl.pathname === "/pinterest/") {
				return new Response(
					'<html><head><meta property="og:title" content="Pinterest"><meta property="og:image" content="https://i.pinimg.com/profile.jpg"></head><body><h1>Pinterest</h1><img alt="Pinterest profile" src="https://i.pinimg.com/profile.jpg"><span>팔로워 626.7만명</span></body></html>',
					{ headers: { "content-type": "text/html" } },
				);
			}
			if (requestUrl.pathname === "/dlvveee/") {
				return new Response(
					'<html><head><meta property="og:title" content="qlaucusx (dlvveee) - Profile | Pinterest"><meta property="og:image" content="https://i.pinimg.com/author-profile.jpg"></head><body><h1>qlaucusx</h1><img alt="qlaucusx" src="https://i.pinimg.com/author-profile.jpg"></body></html>',
					{ headers: { "content-type": "text/html" } },
				);
			}
			if (requestUrl.pathname === "/wrong-user/") {
				return new Response(
					'<html><head><meta property="og:title" content="Wrong user"><meta property="og:image" content="https://i.pinimg.com/wrong-profile.jpg"></head><body><h1>Wrong user</h1></body></html>',
					{ headers: { "content-type": "text/html" } },
				);
			}
			if (requestUrl.pathname === "/pinterest/girls-night-in/") {
				return new Response(
					'<html><head><meta property="og:title" content="Girls night in"><meta property="og:image" content="https://i.pinimg.com/board.jpg"></head><body><h1>Girls night in</h1><a href="/explore/">Explore</a><a href="/wrong-user/">Wrong user</a><a href="/pinterest/">Pinterest</a><a href="/pin/111/"><img src="https://i.pinimg.com/pin-1.jpg"></a><a href="/pin/222/"><img src="https://i.pinimg.com/pin-2.jpg"></a><a href="/pin/333/"><img src="https://i.pinimg.com/pin-3.jpg"></a><a href="/pin/444/"><img src="https://i.pinimg.com/pin-4.jpg"></a><a href="/pin/555/"><img src="https://i.pinimg.com/pin-5.jpg"></a></body></html>',
					{ headers: { "content-type": "text/html" } },
				);
			}
			if (requestUrl.pathname.startsWith("/pin/")) {
				return new Response(
					'<html><head><meta property="og:title" content="The Outsiders"><meta property="og:image" content="https://i.pinimg.com/the-outsiders.jpg"></head><body><h1>The Outsiders</h1><a href="/explore/">Explore</a><a href="/dlvveee/">dlvveee</a></body></html>',
					{ headers: { "content-type": "text/html" } },
				);
			}
		}
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
			if (requestUrl.pathname === "/youtube/v3/channels") {
				return json({
					items: [
						{
							contentDetails: {
								relatedPlaylists: { uploads: "uploads-playlist" },
							},
							snippet: {
								title: "Grabbin",
								description: "A product video",
								thumbnails: {
									high: { url: "https://img.youtube.com/channel.jpg" },
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
			if (requestUrl.pathname === "/youtube/v3/playlistItems") {
				return json({
					items: [1, 2, 3, 4].map((index) => ({
						snippet: {
							thumbnails: {
								high: {
									url: `https://img.youtube.com/video-${index}.jpg`,
								},
							},
						},
					})),
				});
			}
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
						channelId: "a6c4ddb09cdb160478996007bff35296",
						channelName: "Grabbin Live",
						followerCount: 77,
						channelImageUrl: "https://chzzk.example.com/channel.png",
					},
				],
			});
		}
		if (
			requestUrl.hostname === "api-channel.sooplive.com" &&
			requestUrl.pathname === "/v1.1/channel/kinwooky/station"
		) {
			return json({
				station: {
					userId: "kinwooky",
					userNick: "Kin Wooky",
					profileImage: "https://profile.soop.example/kinwooky.jpg",
				},
				upd: { fanCnt: 12345 },
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
			expectedTitle?: string;
			expectedActionLabel?: string;
			expectedActionBackground?: string;
			expectedCardBackground?: string;
			expectedActionDetail?: string;
			expectedImageUrl?: string;
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
				url: "https://chzzk.naver.com/a6c4ddb09cdb160478996007bff35296/clips?filterType=ALL&orderType=POPULAR",
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
				name: "SOOP",
				url: "https://www.sooplive.com/station/kinwooky",
				provider: "soop",
				key: "favoriteCount",
				expected: 12345,
				expectedTitle: "Kin Wooky",
				expectedActionLabel: "Watch",
				expectedActionBackground: "#1C44AB",
				expectedCardBackground: "#F4F6FB",
				expectedActionDetail: "12.3K",
				expectedImageUrl: "https://profile.soop.example/kinwooky.jpg",
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
			if (testCase.expectedTitle)
				assert.equal(metadata.title, testCase.expectedTitle, testCase.name);
			if (testCase.expectedActionLabel)
				assert.equal(
					resolveLinkMetadata(testCase.url, metadata).presentation.actionLabel,
					testCase.expectedActionLabel,
					testCase.name,
				);
			if (testCase.expectedActionBackground)
				assert.equal(
					resolveLinkMetadata(testCase.url, metadata).presentation
						.actionBackground,
					testCase.expectedActionBackground,
					testCase.name,
				);
			if (testCase.expectedCardBackground)
				assert.equal(
					resolveLinkMetadata(testCase.url, metadata).presentation
						.cardBackground,
					testCase.expectedCardBackground,
					testCase.name,
				);
			if (testCase.expectedActionDetail)
				assert.equal(
					resolveLinkMetadata(testCase.url, metadata).presentation.actionDetail,
					testCase.expectedActionDetail,
					testCase.name,
				);
			if (testCase.expectedImageUrl) {
				assert.equal(
					metadata.imageUrl,
					testCase.expectedImageUrl,
					testCase.name,
				);
				assert.deepEqual(
					resolveLinkMetadata(testCase.url, metadata).presentation.imageUrls,
					[testCase.expectedImageUrl],
					testCase.name,
				);
			}
			assert.equal(
				metadata.providerData?.[testCase.key],
				testCase.expected,
				testCase.name,
			);
		}
	});

	/**
	 * Case ID: LINK-PROVIDERS-004
	 * Given: a Behance profile URL and a public project URL.
	 * When: the shared provider metadata collector reads both pages.
	 * Then: it returns profile metadata and follower count, and project title, description, and image.
	 * Evidence: enriched metadata for each URL and resolved target kind.
	 * Result: Pass | Fail | Blocked | Not Run
	 */
	it("LINK-PROVIDERS-004 collects Behance profile and project metadata", async () => {
		const fetch = createFetch();
		const profileUrl = new URL("https://www.behance.net/kinwooky");
		const projectUrl = new URL(
			"https://www.behance.net/gallery/123456789/portfolio-project",
		);
		const profile = await enrichLinkProvider(profileUrl, { fetch });
		const project = await enrichLinkProvider(projectUrl, { fetch });

		assert.equal(resolveLinkProvider(profileUrl).target?.kind, "profile");
		assert.equal(resolveLinkProvider(projectUrl).target?.kind, "project");
		assert.equal(profile.title, "Artist Profile");
		assert.equal(profile.providerData?.followerCount, 2_400_000);
		assert.equal(
			resolveLinkMetadata(profileUrl.toString(), profile).presentation
				.actionDetail,
			"2.4M",
		);
		assert.deepEqual(profile.providerData?.recentProjectThumbnailUrls, [
			"https://mir-s3-cdn-cf.behance.net/projects/thumb-1.webp",
			"https://mir-s3-cdn-cf.behance.net/projects/thumb-2.webp",
			"https://mir-s3-cdn-cf.behance.net/projects/thumb-3.webp",
			"https://mir-s3-cdn-cf.behance.net/projects/thumb-4.webp",
		]);
		assert.deepEqual(
			resolveLinkMetadata(profileUrl.toString(), profile).presentation
				.imageUrls,
			profile.providerData?.recentProjectThumbnailUrls,
		);
		assert.equal(project.title, "Portfolio Project");
		assert.equal(project.description, undefined);
		assert.equal(project.providerData?.authorName, "Anna Krupkin");
		assert.equal(
			project.providerData?.authorProfileImageUrl,
			"https://pps.services.adobe.com/anna.jpg",
		);
		assert.equal(
			resolveLinkMetadata(projectUrl.toString(), project).presentation
				.actionLabel,
			"View",
		);
		assert.equal(
			resolveLinkMetadata(profileUrl.toString(), profile).presentation
				.actionLabel,
			"Follow",
		);
		assert.equal(
			project.imageUrl,
			"https://mir-s3-cdn-cf.behance.net/project-cover.jpg",
		);
		const behanceTheme = providerDefinitionList.find(
			({ id }) => id === "behance",
		)?.theme;
		assert.equal(behanceTheme?.faviconBackground, undefined);
		assert.equal(behanceTheme?.cardBackground, undefined);
		assert.equal(behanceTheme?.actionBackground, "#1769ff");
	});

	/**
	 * Case ID: LINK-PROVIDERS-005
	 * Given: a Dribbble profile and a shot page with its creator profile.
	 * When: the shared provider metadata collector reads both pages with an API token configured.
	 * Then: it returns profile counts and avatar, plus shot title and creator details.
	 * Evidence: provider targets and enriched metadata values from mocked HTML pages.
	 * Result: Pass | Fail | Blocked | Not Run
	 */
	it("LINK-PROVIDERS-005 collects Dribbble profile and shot metadata", async () => {
		const requestedUrls: URL[] = [];
		const baseFetch = createFetch();
		const fetch = async (input: RequestInfo | URL) => {
			requestedUrls.push(new URL(input.toString()));
			return baseFetch(input);
		};
		const profileUrl = new URL("https://dribbble.com/nexuxlab");
		const shotUrl = new URL(
			"https://dribbble.com/shots/27791477-AI-Mental-Health-Platform",
		);
		const profile = await enrichLinkProvider(profileUrl, { fetch });
		const shot = await enrichLinkProvider(shotUrl, {
			fetch,
			env: { DRIBBBLE_ACCESS_TOKEN: "unused-token" },
		});

		assert.equal(resolveLinkProvider(profileUrl).target?.kind, "profile");
		assert.equal(resolveLinkProvider(shotUrl).target?.kind, "shot");
		assert.equal(profile.providerData?.followerCount, 254);
		assert.equal(profile.providerData?.followingCount, 337);
		assert.equal(profile.providerData?.likeCount, 1750);
		assert.equal(
			resolveLinkMetadata(profileUrl.toString(), profile).presentation
				.actionIcon,
			"like2",
		);
		assert.equal(
			resolveLinkMetadata(profileUrl.toString(), profile).presentation
				.actionLabel,
			"1,750 Likes",
		);
		assert.equal(
			profile.providerData?.profileImageUrl,
			"https://cdn.dribbble.com/team.png",
		);
		assert.deepEqual(profile.providerData?.recentShotThumbnailUrls, [
			"https://cdn.dribbble.com/shot-0.png",
			"https://cdn.dribbble.com/shot-1.png",
			"https://cdn.dribbble.com/shot-2.png",
			"https://cdn.dribbble.com/shot-3.png",
		]);
		assert.deepEqual(
			resolveLinkMetadata(profileUrl.toString(), profile).presentation
				.imageUrls,
			profile.providerData?.recentShotThumbnailUrls,
		);
		assert.equal(shot.title, "AI Mental Health Platform");
		assert.equal(shot.imageUrl, "https://cdn.dribbble.com/shot.png");
		assert.equal(shot.providerData?.authorName, "NexUX Product");
		assert.equal(
			shot.providerData?.authorProfileUrl,
			"https://dribbble.com/nexuxproduct",
		);
		assert.equal(
			shot.providerData?.authorProfileImageUrl,
			"https://cdn.dribbble.com/creator.png",
		);
		assert.equal(
			requestedUrls.some(
				(requestUrl) => requestUrl.hostname === "api.dribbble.com",
			),
			false,
		);

		const challengeShot = await enrichLinkProvider(
			new URL("https://dribbble.com/shots/12345-Case-Study"),
			{
				fetch: async () =>
					new Response("<html><body>Challenge</body></html>", {
						status: 202,
						headers: { "content-type": "text/html" },
					}),
			},
		);
		assert.equal(challengeShot.title, "Case Study");
	});
	it("LINK-PROVIDERS-003 loads four recent YouTube channel thumbnails", async () => {
		const metadata = await enrichLinkProvider(
			new URL("https://youtube.com/@kinwooky"),
			{ fetch: createFetch(), env: { YOUTUBE_API_KEY: "test-key" } },
		);

		assert.deepEqual(metadata.providerData?.recentVideoThumbnailUrls, [
			"https://img.youtube.com/video-1.jpg",
			"https://img.youtube.com/video-2.jpg",
			"https://img.youtube.com/video-3.jpg",
			"https://img.youtube.com/video-4.jpg",
		]);
	});

	/**
	 * Case ID: LINK-PROVIDERS-006
	 * Given: an Instagram profile page with more than four post cards.
	 * When: provider enrichment reads the page.
	 * Then: it returns the four newest HTTPS post thumbnails for presentation.
	 * Evidence: providerData URLs, imageUrl, and resolved presentation imageUrls.
	 * Result: Pass | Fail | Blocked | Not Run
	 */
	it("LINK-PROVIDERS-006 loads four recent Instagram post thumbnails", async () => {
		const postCards = Array.from(
			{ length: 5 },
			(_, index) =>
				`<a href="/kinwooky/p/post-${index}/"><img src="https://cdn.instagram.com/post-${index}.jpg"></a>`,
		).join("");
		const metadata = await enrichLinkProvider(
			new URL("https://instagram.com/kinwooky"),
			{
				fetch: async () =>
					new Response(
						`<html><head><meta property="og:title" content="Profile"><meta property="og:description" content="2M Followers"></head><body>${postCards}</body></html>`,
						{ headers: { "content-type": "text/html" } },
					),
			},
		);

		const expectedUrls = Array.from(
			{ length: 4 },
			(_, index) => `https://cdn.instagram.com/post-${index}.jpg`,
		);
		assert.deepEqual(
			metadata.providerData?.recentPostThumbnailUrls,
			expectedUrls,
		);
		assert.equal(metadata.imageUrl, expectedUrls[0]);
		assert.deepEqual(
			resolveLinkMetadata("https://instagram.com/kinwooky", metadata)
				.presentation.imageUrls,
			expectedUrls,
		);
	});

	/**
	 * Case ID: LINK-PROVIDERS-002
	 * Given: one real provider-shaped link for every supported provider.
	 * When: the shared provider registry resolves the links.
	 * Then: every link keeps its provider identity and presentation label.
	 * Evidence: provider ID and provider label for every real provider hostname.
	 * Result: Pass | Fail | Blocked | Not Run
	 */
	it("LINK-PROVIDERS-002 resolves every supported provider link", async () => {
		const cases = [
			["youtube", "https://www.youtube.com/watch?v=dQw4w9WgXcQ"],
			["youtube-music", "https://music.youtube.com/watch?v=dQw4w9WgXcQ"],
			["discord", "https://discord.gg/grabbin"],
			["github", "https://github.com/kinwooky"],
			["facebook", "https://www.facebook.com/grabbin"],
			["x", "https://x.com/kinwooky"],
			["spotify", "https://open.spotify.com/artist/0"],
			["app-store", "https://apps.apple.com/us/app/grabbin/id1"],
			[
				"google-play",
				"https://play.google.com/store/apps/details?id=com.grabbin",
			],
			["threads", "https://www.threads.net/@instagram"],
			["instagram", "https://www.instagram.com/instagram/"],
			["buy-me-a-coffee", "https://www.buymeacoffee.com/kinwooky"],
			["linkedin", "https://www.linkedin.com/in/kinwooky"],
			["chzzk", "https://chzzk.naver.com/0123456789abcdef0123456789abcdef"],
			["soop", "https://www.sooplive.com/station/devil0108"],
			["figma", "https://www.figma.com/file/abc"],
			["ko-fi", "https://ko-fi.com/kinwooky"],
			["gumroad", "https://gumroad.com/l/grabbin"],
			["medium", "https://medium.com/@kinwooky"],
			["patreon", "https://www.patreon.com/kinwooky"],
			["product-hunt", "https://www.producthunt.com/products/grabbin"],
			["reddit", "https://www.reddit.com/r/programming/"],
			["tiktok", "https://www.tiktok.com/@tiktok"],
			["twitch", "https://www.twitch.tv/kinwooky"],
			["behance", "https://www.behance.net/kinwooky"],
			["pinterest", "https://www.pinterest.com/pinterest/"],
			["dribbble", "https://dribbble.com/kinwooky"],
			["calendly", "https://calendly.com/kinwooky"],
			["notion", "https://www.notion.so/"],
		] as const;

		assert.equal(cases.length, providerDefinitionList.length);
		for (const [expectedProvider, url] of cases) {
			const resolved = resolveLinkProvider(new URL(url));
			const metadata = resolveLinkMetadata(url);
			const definition = providerDefinitionList.find(
				({ id }) => id === expectedProvider,
			);
			assert.equal(resolved.id, expectedProvider, url);
			assert.equal(metadata.presentation.provider, expectedProvider, url);
			assert.ok(metadata.presentation.providerLabel, url);
			assert.equal(
				metadata.presentation.faviconBackground,
				definition?.theme?.faviconBackground,
				url,
			);
			assert.equal(
				metadata.faviconUrl,
				definition?.faviconUrl ??
					`${providerIconBaseUrl}/${expectedProvider}.svg`,
				url,
			);
			const enriched = await enrichLinkProvider(new URL(url), {
				fetch: createFetch(),
			});
			assert.equal(enriched.provider, expectedProvider, url);
		}
		assert.equal(
			providerDefinitionList.find(({ id }) => id === "github")?.theme
				?.faviconBackground,
			"#181717",
		);
	});

	it("enriches Pinterest profiles, boards, and Pins", async () => {
		const context = { fetch: createFetch() };
		assert.equal(
			resolveLinkProvider(
				new URL("https://www.pinterest.com/pinterest/_created/"),
			).target?.kind,
			"profile",
		);
		assert.equal(
			resolveLinkProvider(new URL("https://pin.it/abc123")).target?.kind,
			"short-link",
		);
		const profile = await enrichLinkProvider(
			new URL("https://kr.pinterest.com/pinterest/"),
			context,
		);
		assert.equal(profile.title, "Pinterest");
		assert.equal(
			resolveLinkMetadata("https://kr.pinterest.com/pinterest/", profile)
				.presentation.actionLabel,
			"Follow",
		);
		assert.equal(profile.providerData?.followerCount, 6_267_000);
		assert.equal(
			profile.providerData?.profileImageUrl,
			"https://i.pinimg.com/profile.jpg",
		);

		const boardUrl = "https://www.pinterest.com/pinterest/girls-night-in/";
		const board = await enrichLinkProvider(new URL(boardUrl), context);
		const boardThumbnails = [1, 2, 3, 4].map(
			(index) => `https://i.pinimg.com/pin-${index}.jpg`,
		);
		assert.equal(board.title, "Girls night in");
		assert.equal(
			resolveLinkMetadata(boardUrl, board).presentation.actionLabel,
			"View",
		);
		assert.equal(board.providerData?.authorName, "Pinterest");
		assert.equal(
			board.providerData?.authorProfileImageUrl,
			"https://i.pinimg.com/profile.jpg",
		);
		assert.equal(board.providerData?.ownerName, "Pinterest");
		assert.equal(
			board.providerData?.ownerProfileImageUrl,
			"https://i.pinimg.com/profile.jpg",
		);
		assert.deepEqual(
			board.providerData?.recentBoardThumbnailUrls,
			boardThumbnails,
		);
		assert.deepEqual(
			resolveLinkMetadata(boardUrl, board).presentation.imageUrls,
			boardThumbnails,
		);

		const pin = await enrichLinkProvider(
			new URL("https://www.pinterest.com/pin/the-outsiders--123456789/"),
			context,
		);
		assert.equal(pin.title, "The Outsiders");
		assert.equal(
			resolveLinkMetadata(
				"https://www.pinterest.com/pin/the-outsiders--123456789/",
				pin,
			).presentation.actionLabel,
			"View",
		);
		assert.equal(pin.imageUrl, "https://i.pinimg.com/the-outsiders.jpg");
		assert.equal(pin.providerData?.authorName, "qlaucusx");
		assert.equal(
			pin.providerData?.authorProfileImageUrl,
			"https://i.pinimg.com/author-profile.jpg",
		);
		const shortPin = await enrichLinkProvider(
			new URL("https://pin.it/abc123"),
			{
				fetch: async (input) => {
					const requestUrl = new URL(input.toString());
					const isAuthor = requestUrl.pathname === "/dlvveee/";
					const response = new Response(
						isAuthor
							? '<html><head><meta property="og:title" content="qlaucusx (dlvveee) - Profile | Pinterest"><meta property="og:image" content="https://i.pinimg.com/author-profile.jpg"></head><body><h1>qlaucusx</h1><img alt="qlaucusx" src="https://i.pinimg.com/author-profile.jpg"></body></html>'
							: '<html><head><meta property="og:title" content="The Outsiders"><meta property="og:image" content="https://i.pinimg.com/the-outsiders.jpg"></head><body><h1>The Outsiders</h1><a href="/dlvveee/">dlvveee</a></body></html>',
						{ headers: { "content-type": "text/html" } },
					);
					Object.defineProperty(response, "url", {
						value: isAuthor
							? requestUrl.toString()
							: "https://kr.pinterest.com/pin/123456789/",
					});
					return response;
				},
			},
		);
		assert.equal(shortPin.title, "The Outsiders");
		assert.equal(shortPin.providerData?.authorName, "qlaucusx");
		assert.equal(
			shortPin.providerData?.authorProfileImageUrl,
			"https://i.pinimg.com/author-profile.jpg",
		);
	});
});
