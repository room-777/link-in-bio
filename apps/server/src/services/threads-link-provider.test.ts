import {
	describe,
	expect,
	it,
} from "bun:test";
import { resolveLinkProvider } from "@services/link-providers";
import {
	createThreadsEnricher,
	parseThreadsProfileMetadata,
} from "@services/threads-link-provider";

describe("Threads link provider", () => {
	it("parses the public profile follower label from og:description", () => {
		const metadata =
			parseThreadsProfileMetadata(
				'<meta property="og:description" content="7.0M Followers • 1.3K Threads • Say more" />',
			);

		expect(metadata).toEqual({
			description:
				"7.0M Followers • 1.3K Threads • Say more",
			providerData: {
				followerCount: 7_000_000,
				followerCountLabel: "7.0M",
				followerCountApproximate: true,
			},
		});
	});

	it("supports thousands and HTML-escaped metadata attributes", () => {
		const metadata =
			parseThreadsProfileMetadata(
				'<meta content="12,345 Followers &#x2022; 98 Threads" property="og:description">',
			);

		expect(
			metadata.providerData,
		).toEqual({
			followerCount: 12_345,
			followerCountLabel: "12,345",
			followerCountApproximate: false,
		});
	});

	it("falls back for non-profile Threads URLs", async () => {
		let fallbackCalled = false;
		const enrich =
			createThreadsEnricher(
				async () => {
					fallbackCalled = true;
					return { title: "fallback" };
				},
			);

		const metadata = await enrich(
			new URL(
				"https://www.threads.com/@threads/post/123",
			),
			{ fetch },
		);

		expect(fallbackCalled).toBe(true);
		expect(metadata).toEqual({
			title: "fallback",
		});
	});

	it("fetches a public profile and preserves the rounded display label", async () => {
		let requestedUrl = "";
		const enrich =
			createThreadsEnricher(
				async () => ({
					title: "Threads",
					description:
						"Profile description",
					imageUrl:
						"https://cdn.example.com/profile.webp",
				}),
			);
		const metadata = await enrich(
			new URL(
				"https://threads.net/@threads",
			),
			{
				fetch: async (input) => {
					requestedUrl = String(input);
					return new Response(
						'<meta property="og:title" content="Threads (@threads) • Threads, Say more">' +
							'<meta property="og:image" content="https://cdn.example.com/threads.webp">' +
							'<meta property="og:description" content="7.0M Followers • 1.3K Threads">',
						{
							status: 200,
							headers: {
								"content-type":
									"text/html",
							},
						},
					);
				},
			},
		);

		expect(requestedUrl).toBe(
			"https://www.threads.com/@threads",
		);
		expect(metadata).toEqual({
			title:
				"Threads (@threads) • Threads, Say more",
			description:
				"7.0M Followers • 1.3K Threads",
			imageUrl:
				"https://cdn.example.com/threads.webp",
			providerData: {
				followerCount: 7_000_000,
				followerCountLabel: "7.0M",
				followerCountApproximate: true,
			},
		});
	});

	it("is selected by the shared provider registry for profile URLs", () => {
		expect(
			resolveLinkProvider(
				new URL(
					"https://www.threads.com/@threads",
				),
			).id,
		).toBe("threads");
	});
});
