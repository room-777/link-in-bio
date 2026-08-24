import {
	describe,
	expect,
	it,
} from "bun:test";
import { parseInstagramProfileMetadata } from "@services/instagram-link-provider";
import { resolveLinkProvider } from "@services/link-providers";
import { parseTikTokProfileMetadata } from "@services/tiktok-link-provider";
import { parseXProfileMetadata } from "@services/x-link-provider";

describe("social profile link providers", () => {
	it("parses Instagram follower metadata from the public OG description", () => {
		const metadata =
			parseInstagramProfileMetadata(
				'<meta property="og:title" content="Instagram (&#064;instagram) &#x2022; Instagram photos and videos">' +
					'<meta property="og:description" content="686M Followers, 267 Following, 8,542 Posts - See Instagram photos and videos">' +
					'<meta property="og:image" content="https://cdn.example.com/instagram.jpg">',
			);

		expect(metadata).toEqual({
			title:
				"Instagram (@instagram) • Instagram photos and videos",
			description:
				"686M Followers, 267 Following, 8,542 Posts - See Instagram photos and videos",
			imageUrl:
				"https://cdn.example.com/instagram.jpg",
			providerData: {
				followerCount: 686_000_000,
				followerCountLabel: "686M",
				followerCountApproximate: true,
			},
		});
	});

	it("parses X follower metadata from the public OG description", () => {
		const metadata =
			parseXProfileMetadata(
				'<meta property="og:title" content="Elon Musk (@elonmusk) on X">' +
					'<meta property="og:description" content="241083907 followers · 1377 following. Joined Jun 2009. See the latest conversations with @elonmusk">' +
					'<meta property="og:image" content="https://pbs.twimg.com/profile_images/avatar.jpg">',
			);

		expect(
			metadata.providerData,
		).toEqual({
			followerCount: 241_083_907,
			followerCountLabel: "241083907",
			followerCountApproximate: false,
		});
		expect(metadata.title).toBe(
			"Elon Musk (@elonmusk) on X",
		);
		expect(metadata.imageUrl).toBe(
			"https://pbs.twimg.com/profile_images/avatar.jpg",
		);
	});

	it("parses X follower metadata from the standard description fallback", () => {
		const metadata =
			parseXProfileMetadata(
				'<meta name="description" content="241083907 followers · 1377 following. Joined Jun 2009.">',
			);

		expect(
			metadata.providerData,
		).toEqual({
			followerCount: 241_083_907,
			followerCountLabel: "241083907",
			followerCountApproximate: false,
		});
	});

	it("parses X follower metadata from profile SSR data when OG description has only the bio", () => {
		const metadata =
			parseXProfileMetadata(
				'<meta property="og:description" content="스텔라이브에 파도를 타고 온 루키">' +
					"<script>relationship_counts:{followers:97959,following:161}</script>",
			);

		expect(
			metadata.providerData,
		).toEqual({
			followerCount: 97_959,
			followerCountLabel: "97959",
			followerCountApproximate: false,
		});
	});

	it("parses TikTok follower metadata from universal hydration JSON", () => {
		const metadata =
			parseTikTokProfileMetadata(
				'<meta property="og:title" content="TikTok (@tiktok)">' +
					'<meta property="og:image" content="https://cdn.example.com/tiktok.jpg">' +
					'<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__" type="application/json">' +
					JSON.stringify({
						__DEFAULT_SCOPE__: {
							"webapp.user-detail": {
								userInfo: {
									user: {
										nickname: "TikTok",
										uniqueId: "tiktok",
										signature:
											"Official TikTok",
										avatarLarger:
											"https://cdn.example.com/tiktok-avatar.jpg",
									},
									stats: {
										followerCount: 1_234_567,
										followingCount: 42,
										heartCount: 9_876_543,
										videoCount: 123,
									},
								},
							},
						},
					}) +
					"</script>",
			);

		expect(metadata).toEqual({
			title: "TikTok (@tiktok)",
			description: "Official TikTok",
			imageUrl:
				"https://cdn.example.com/tiktok.jpg",
			providerData: {
				followerCount: 1_234_567,
				followerCountLabel: "1234567",
				followerCountApproximate: false,
			},
		});
	});

	it("routes profile URLs to their specific providers", () => {
		expect(
			resolveLinkProvider(
				new URL(
					"https://www.instagram.com/instagram/",
				),
			).id,
		).toBe("instagram");
		expect(
			resolveLinkProvider(
				new URL(
					"https://x.com/elonmusk",
				),
			).id,
		).toBe("x");
		expect(
			resolveLinkProvider(
				new URL(
					"https://www.tiktok.com/@tiktok",
				),
			).id,
		).toBe("tiktok");
	});
});
