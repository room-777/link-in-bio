import assert from "node:assert/strict";
import { describe, it } from "node:test";

const { mock } = require("bun:test") as {
	mock: { module: (specifier: string, factory: () => unknown) => void };
};
mock.module("cloudflare:workers", () => ({ env: {} }));

const { previewWidget, WidgetPreviewError } = await import(
	"../../src/services/widget-preview.service"
);

function countingFetch(respond: (url: string) => Response) {
	const urls: string[] = [];
	const fetch = (async (input: RequestInfo | URL) => {
		const url = input.toString();
		urls.push(url);
		return respond(url);
	}) as typeof globalThis.fetch;
	return { fetch, urls };
}

const isError = (code: string) => (error: unknown) =>
	error instanceof WidgetPreviewError && error.code === code;

/** The fields of a real react-tweet answer that the widget renders. */
const tweet = {
	__typename: "Tweet",
	id_str: "20",
	text: "just setting up my twttr",
	created_at: "2006-03-21T20:50:14.000Z",
	display_text_range: [0, 24],
	favorite_count: 300000,
	lang: "en",
	user: {
		name: "jack",
		screen_name: "jack",
		profile_image_url_https: "https://pbs.twimg.com/profile_images/1/a.jpg",
		verified: false,
		is_blue_verified: true,
	},
	entities: { hashtags: [], urls: [], user_mentions: [], symbols: [] },
};

describe("widget preview service", () => {
	/**
	 * Case ID: WIDGET-PREVIEW-001
	 * Given: a Spotify widget preview is asked for a non-Spotify URL.
	 * When: previewWidget runs with kind=spotify.
	 * Then: it rejects the URL before any outbound request.
	 * Evidence: WidgetPreviewError.code=WIDGET_URL_MISMATCH and fetched URLs=[].
	 * Result: Pass | Fail | Blocked | Not Run
	 */
	it("WIDGET-PREVIEW-001 rejects a non-Spotify URL before fetching", async () => {
		const { fetch, urls } = countingFetch(() => new Response());
		await assert.rejects(
			previewWidget(
				{ kind: "spotify", url: "https://example.com/track/123" },
				{ fetch },
			),
			isError("WIDGET_URL_MISMATCH"),
		);
		assert.deepEqual(urls, []);
	});

	/**
	 * Case ID: WIDGET-PREVIEW-002
	 * Given: react-tweet answers with a valid payload for post 20.
	 * When: previewWidget runs with kind=tweet and a twitter.com URL.
	 * Then: it calls react-tweet once and returns the payload with an x.com URL.
	 * Evidence: fetched URLs and the full preview object, including unrendered fields.
	 * Result: Pass | Fail | Blocked | Not Run
	 */
	it("WIDGET-PREVIEW-002 loads a Tweet through react-tweet and normalizes its URL", async () => {
		const { fetch, urls } = countingFetch(() => Response.json({ data: tweet }));

		const preview = await previewWidget(
			{ kind: "tweet", url: "https://twitter.com/jack/status/20" },
			{ fetch },
		);

		assert.deepEqual(urls, ["https://react-tweet.vercel.app/api/tweet/20"]);
		assert.deepEqual(preview, {
			kind: "tweet",
			data: { url: "https://x.com/i/status/20", tweet },
		});
	});

	/**
	 * Case ID: WIDGET-PREVIEW-003
	 * Given: react-tweet answers with a valid payload for a different post.
	 * When: previewWidget runs with kind=tweet for post 20.
	 * Then: it rejects the answer.
	 * Evidence: WidgetPreviewError.code=TWEET_UNAVAILABLE.
	 * Result: Pass | Fail | Blocked | Not Run
	 */
	it("WIDGET-PREVIEW-003 rejects a Tweet answer for another post", async () => {
		const { fetch } = countingFetch(() =>
			Response.json({ data: { ...tweet, id_str: "21" } }),
		);
		await assert.rejects(
			previewWidget(
				{ kind: "tweet", url: "https://x.com/jack/status/20" },
				{ fetch },
			),
			isError("TWEET_UNAVAILABLE"),
		);
	});

	/**
	 * Case ID: WIDGET-PREVIEW-004
	 * Given: a Tweet preview is asked for a URL without a status ID.
	 * When: previewWidget runs with kind=tweet.
	 * Then: it rejects the URL before any outbound request.
	 * Evidence: WidgetPreviewError.code=WIDGET_URL_MISMATCH and fetched URLs=[].
	 * Result: Pass | Fail | Blocked | Not Run
	 */
	it("WIDGET-PREVIEW-004 rejects a URL that is not a Tweet before fetching", async () => {
		const { fetch, urls } = countingFetch(() => new Response());
		await assert.rejects(
			previewWidget({ kind: "tweet", url: "https://x.com/jack" }, { fetch }),
			isError("WIDGET_URL_MISMATCH"),
		);
		assert.deepEqual(urls, []);
	});

	/**
	 * Case ID: WIDGET-PREVIEW-005
	 * Given: react-tweet answers 200 with bodies that miss or mistype rendered fields.
	 * When: previewWidget runs with kind=tweet for post 20 on each body.
	 * Then: every body is rejected instead of being saved into a widget.
	 * Evidence: WidgetPreviewError.code=TWEET_UNAVAILABLE for each labelled body.
	 * Result: Pass | Fail | Blocked | Not Run
	 */
	it("WIDGET-PREVIEW-005 rejects malformed Tweet payloads", async () => {
		const { user: _user, ...withoutUser } = tweet;
		const bodies: Array<[string, () => Response]> = [
			["not JSON", () => new Response("<html>")],
			["no data", () => Response.json({})],
			["only id_str", () => Response.json({ data: { id_str: "20" } })],
			["no user", () => Response.json({ data: withoutUser })],
			[
				"user without screen_name",
				() =>
					Response.json({
						data: { ...tweet, user: { ...tweet.user, screen_name: 1 } },
					}),
			],
			[
				"text is not a string",
				() => Response.json({ data: { ...tweet, text: null } }),
			],
			[
				"bad display_text_range",
				() => Response.json({ data: { ...tweet, display_text_range: [0] } }),
			],
			[
				"entity without indices",
				() =>
					Response.json({
						data: { ...tweet, entities: { urls: [{ url: "https://t.co" }] } },
					}),
			],
			[
				"video without variants",
				() => Response.json({ data: { ...tweet, video: { poster: "x" } } }),
			],
		];
		for (const [label, respond] of bodies) {
			const { fetch } = countingFetch(respond);
			await assert.rejects(
				previewWidget(
					{ kind: "tweet", url: "https://x.com/jack/status/20" },
					{ fetch },
				),
				isError("TWEET_UNAVAILABLE"),
				label,
			);
		}
	});

	/**
	 * Case ID: WIDGET-PREVIEW-006
	 * Given: react-tweet answers with a non-2xx status.
	 * When: previewWidget runs with kind=tweet.
	 * Then: it reports the Tweet as unavailable.
	 * Evidence: WidgetPreviewError.code=TWEET_UNAVAILABLE.
	 * Result: Pass | Fail | Blocked | Not Run
	 */
	it("WIDGET-PREVIEW-006 reports an upstream error as unavailable", async () => {
		const { fetch } = countingFetch(
			() => new Response("not found", { status: 404 }),
		);
		await assert.rejects(
			previewWidget(
				{ kind: "tweet", url: "https://x.com/jack/status/20" },
				{ fetch },
			),
			isError("TWEET_UNAVAILABLE"),
		);
	});
});
