import { widgetPreviewRequestSchema } from "@grabbin/api";
import type { MiddlewareHandler } from "hono";
import { Hono } from "hono";
import * as v from "valibot";
import { jsonApiError } from "../api-error";
import { createOutboundFetch } from "../services/outbound-fetch";
import { RssServiceError } from "../services/rss/rss.service";
import {
	WidgetPreviewError,
	type WidgetPreviewer,
} from "../services/widget-preview.service";
import type { AppEnv } from "../types";

const rssErrorDetails = {
	UNSUPPORTED_RSS_URL: "This address is not a supported RSS source.",
	RSS_FEED_UNAVAILABLE: "The RSS feed could not be loaded.",
	INVALID_RSS_FEED: "The RSS feed returned invalid data.",
} as const;

const widgetErrorDetails = {
	WIDGET_URL_MISMATCH: "This address does not match the widget.",
	SPOTIFY_PREVIEW_UNAVAILABLE: "Spotify data could not be loaded. Try again.",
	TWEET_UNAVAILABLE: "Unable to load this Tweet. Try again.",
} as const;

export function createWidgetsController({
	sessionMiddleware,
	preview,
}: {
	sessionMiddleware: MiddlewareHandler<AppEnv>;
	preview: WidgetPreviewer;
}) {
	return new Hono<AppEnv>().post("/preview", sessionMiddleware, async (c) => {
		const parsed = v.safeParse(
			widgetPreviewRequestSchema,
			await c.req.json().catch(() => null),
		);
		if (!parsed.success)
			return jsonApiError(c, {
				status: 422,
				code: "INVALID_WIDGET_PREVIEW",
				detail: "Invalid widget preview request.",
			});

		try {
			return c.json(
				await preview(parsed.output, {
					fetch: createOutboundFetch(c.env),
					env: c.env,
				}),
			);
		} catch (error) {
			if (error instanceof RssServiceError)
				return jsonApiError(c, {
					status: error.code === "UNSUPPORTED_RSS_URL" ? 422 : 502,
					code: error.code,
					detail: rssErrorDetails[error.code],
				});
			if (error instanceof WidgetPreviewError)
				return jsonApiError(c, {
					status: error.code === "WIDGET_URL_MISMATCH" ? 422 : 502,
					code: error.code,
					detail: widgetErrorDetails[error.code],
				});
			throw error;
		}
	});
}
