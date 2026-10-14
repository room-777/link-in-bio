import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	getItemPresets,
	getWidgetKind,
	requiresProPlan,
	resolveLinkMetadata,
	type WidgetKindInput,
} from "../src/index";

function link(
	url: string,
	metadata?: { provider?: string; widget?: "spotify"; title?: string },
): WidgetKindInput {
	return { type: "link", data: { url, metadata } } as WidgetKindInput;
}

const rss = link("https://example.substack.com/feed", {
	title: "RSS Feed",
	provider: "rss-feed",
});
const tweet = link("https://x.com/jack/status/20", { provider: "tweet" });
const spotifyWidget = link("https://open.spotify.com/track/123", {
	provider: "spotify",
	widget: "spotify",
});
const spotifyLink = link("https://open.spotify.com/track/123", {
	provider: "spotify",
});
const calendly: WidgetKindInput = { type: "calendly" };

describe("getWidgetKind", () => {
	it("identifies each widget from the item shapes the editor saves", () => {
		assert.equal(getWidgetKind(rss), "rss");
		assert.equal(getWidgetKind(tweet), "tweet");
		assert.equal(getWidgetKind(spotifyWidget), "spotify");
		assert.equal(getWidgetKind(calendly), "calendly");
	});

	it("keeps Spotify URLs without the widget marker as plain links", () => {
		assert.equal(getWidgetKind(spotifyLink), null);
	});

	it("ignores a widget marker whose provider is not Spotify", () => {
		assert.equal(
			getWidgetKind(
				link("https://example.com", { provider: "website", widget: "spotify" }),
			),
			null,
		);
		assert.equal(
			getWidgetKind(link("https://example.com", { widget: "spotify" })),
			null,
		);
	});

	it("treats links without metadata and other item types as non-widgets", () => {
		assert.equal(getWidgetKind(link("https://example.com")), null);
		assert.equal(
			getWidgetKind(link("https://youtube.com/@a", { provider: "youtube" })),
			null,
		);
		assert.equal(getWidgetKind({ type: "media" }), null);
		assert.equal(getWidgetKind({ type: "text" }), null);
	});

	it("still identifies widgets after metadata is resolved for display", () => {
		const resolve = (url: string, metadata: Record<string, string>) =>
			getWidgetKind({
				type: "link",
				data: { metadata: resolveLinkMetadata(url, metadata) },
			});
		assert.equal(
			resolve("https://example.substack.com/feed", { provider: "rss-feed" }),
			"rss",
		);
		assert.equal(
			resolve("https://x.com/jack/status/20", { provider: "tweet" }),
			"tweet",
		);
		assert.equal(
			resolve("https://open.spotify.com/track/1", {
				provider: "spotify",
				widget: "spotify",
			}),
			"spotify",
		);
		// A stored provider the URL does not back is replaced, so the link is plain.
		assert.equal(
			resolve("https://example.com/", {
				provider: "spotify",
				widget: "spotify",
			}),
			null,
		);
	});
});

describe("getItemPresets", () => {
	it("limits Tweets to the two tall sizes", () => {
		assert.deepEqual(getItemPresets(tweet), ["portrait", "squareLarge"]);
	});

	it("gives other widgets and plain links every link size", () => {
		const linkSizes = [
			"squareSmall",
			"halfBanner",
			"landscape",
			"portrait",
			"squareLarge",
		];
		assert.deepEqual(getItemPresets(rss), linkSizes);
		assert.deepEqual(getItemPresets(spotifyWidget), linkSizes);
		assert.deepEqual(getItemPresets(spotifyLink), linkSizes);
		assert.deepEqual(getItemPresets(calendly), linkSizes);
	});

	it("falls back to the item type sizes for non-widgets", () => {
		assert.deepEqual(getItemPresets({ type: "section" }), ["fullBanner"]);
	});
});

describe("requiresProPlan", () => {
	it("requires Pro for every widget and coming-soon widget provider", () => {
		for (const item of [rss, tweet, spotifyWidget, calendly]) {
			assert.equal(requiresProPlan(item), true);
		}
		for (const provider of [
			"soundcloud",
			"apple-music",
			"signature",
			"calendly",
		]) {
			assert.equal(
				requiresProPlan(link("https://example.com", { provider })),
				true,
				provider,
			);
		}
	});

	it("lets free accounts add plain links, including Spotify links", () => {
		assert.equal(requiresProPlan(spotifyLink), false);
		assert.equal(requiresProPlan(link("https://example.com")), false);
		assert.equal(
			requiresProPlan(link("https://x.com/jack", { provider: "x" })),
			false,
		);
		assert.equal(requiresProPlan({ type: "media" }), false);
	});
});
