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

describe("widget preview service", () => {
	it("rejects a non-Spotify URL for the Spotify widget before fetching", async () => {
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

	it("loads a Tweet through the react-tweet API and saves a normalized URL", async () => {
		const tweet = { id_str: "20", text: "just setting up my twttr" };
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

	it("rejects a Tweet whose answer is for another post", async () => {
		const { fetch } = countingFetch(() =>
			Response.json({ data: { id_str: "21" } }),
		);
		await assert.rejects(
			previewWidget(
				{ kind: "tweet", url: "https://x.com/jack/status/20" },
				{ fetch },
			),
			isError("TWEET_UNAVAILABLE"),
		);
	});

	it("rejects a URL that is not a Tweet before fetching", async () => {
		const { fetch, urls } = countingFetch(() => new Response());
		await assert.rejects(
			previewWidget({ kind: "tweet", url: "https://x.com/jack" }, { fetch }),
			isError("WIDGET_URL_MISMATCH"),
		);
		assert.deepEqual(urls, []);
	});
});
