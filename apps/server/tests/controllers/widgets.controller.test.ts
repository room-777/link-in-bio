import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { MiddlewareHandler } from "hono";
import { Hono } from "hono";
import type { AppEnv } from "../../src/types";

const { mock } = require("bun:test") as {
	mock: { module: (specifier: string, factory: () => unknown) => void };
};
mock.module("cloudflare:workers", () => ({ env: {} }));

const { createWidgetsController } = await import(
	"../../src/controllers/widgets.controller"
);
const { WidgetPreviewError } = await import(
	"../../src/services/widget-preview.service"
);
const { RssServiceError } = await import("../../src/services/rss/rss.service");

type Preview = Parameters<typeof createWidgetsController>[0]["preview"];

const signedIn: MiddlewareHandler<AppEnv> = async (c, next) => {
	c.set("session", {
		user: { id: "user-1", email: "user@example.com" },
	} as never);
	await next();
};
const signedOut: MiddlewareHandler<AppEnv> = async (c) =>
	c.json({ status: 401 }, 401);

function post(
	body: unknown,
	preview: Preview,
	sessionMiddleware: MiddlewareHandler<AppEnv> = signedIn,
) {
	const app = new Hono<AppEnv>().route(
		"/widgets",
		createWidgetsController({ sessionMiddleware, preview }),
	);
	return app.request("/widgets/preview", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(body),
	});
}

const unused: Preview = async () => {
	throw new Error("preview should not run");
};

describe("widgets controller", () => {
	it("returns the preview for the requested kind", async () => {
		const requests: unknown[] = [];
		const response = await post(
			{ kind: "spotify", url: "https://open.spotify.com/album/1" },
			async (request) => {
				requests.push(request);
				return {
					kind: "spotify",
					data: {
						url: request.url,
						title: "Album",
						spotify: { type: "album" },
					},
				};
			},
		);

		assert.equal(response.status, 200);
		assert.deepEqual(requests, [
			{ kind: "spotify", url: "https://open.spotify.com/album/1" },
		]);
		assert.deepEqual(await response.json(), {
			kind: "spotify",
			data: {
				url: "https://open.spotify.com/album/1",
				title: "Album",
				spotify: { type: "album" },
			},
		});
	});

	it("requires a session", async () => {
		const response = await post(
			{ kind: "tweet", url: "https://x.com/jack/status/20" },
			unused,
			signedOut,
		);
		assert.equal(response.status, 401);
	});

	it("rejects unknown kinds and non-HTTPS URLs", async () => {
		for (const body of [
			{ kind: "calendly", url: "https://calendly.com/a" },
			{ kind: "rss", url: "http://example.com/feed" },
			{ url: "https://example.com" },
		]) {
			const response = await post(body, unused);
			assert.equal(response.status, 422, JSON.stringify(body));
			assert.equal(
				((await response.json()) as { code: string }).code,
				"INVALID_WIDGET_PREVIEW",
			);
		}
	});

	it("maps preview failures to problem responses", async () => {
		const cases = [
			[new RssServiceError("UNSUPPORTED_RSS_URL"), 422, "UNSUPPORTED_RSS_URL"],
			[
				new RssServiceError("RSS_FEED_UNAVAILABLE"),
				502,
				"RSS_FEED_UNAVAILABLE",
			],
			[
				new WidgetPreviewError("WIDGET_URL_MISMATCH"),
				422,
				"WIDGET_URL_MISMATCH",
			],
			[new WidgetPreviewError("TWEET_UNAVAILABLE"), 502, "TWEET_UNAVAILABLE"],
		] as const;
		for (const [error, status, code] of cases) {
			const response = await post(
				{ kind: "rss", url: "https://example.com/feed" },
				async () => {
					throw error;
				},
			);
			assert.equal(response.status, status, code);
			assert.equal(((await response.json()) as { code: string }).code, code);
		}
	});
});
