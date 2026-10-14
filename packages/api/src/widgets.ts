import * as v from "valibot";
import {
	pageItemLinkUrlSchema,
	pageItemRssDataSchema,
	pageItemSpotifyDataSchema,
	pageItemTweetDataSchema,
} from "./grid";
import { rssFeedResponseSchema } from "./rss";

/** What the editor sends to look up a widget before adding it. */
export const widgetPreviewRequestSchema = v.variant("kind", [
	v.object({ kind: v.literal("rss"), url: pageItemLinkUrlSchema }),
	v.object({ kind: v.literal("spotify"), url: pageItemLinkUrlSchema }),
	v.object({ kind: v.literal("tweet"), url: pageItemLinkUrlSchema }),
]);

export type WidgetPreviewRequest = v.InferOutput<
	typeof widgetPreviewRequestSchema
>;

/** Each answer holds the data the widget saves, ready to store as is. */
export const widgetPreviewResponseSchema = v.variant("kind", [
	v.object({
		kind: v.literal("rss"),
		data: v.object({
			...pageItemRssDataSchema.entries,
			feed: rssFeedResponseSchema,
		}),
	}),
	v.object({
		kind: v.literal("spotify"),
		data: v.object({
			...pageItemSpotifyDataSchema.entries,
			title: v.string(),
			spotify: v.nonOptional(pageItemSpotifyDataSchema.entries.spotify),
		}),
	}),
	v.object({
		kind: v.literal("tweet"),
		data: v.object({
			...pageItemTweetDataSchema.entries,
			tweet: v.nonOptional(pageItemTweetDataSchema.entries.tweet),
		}),
	}),
]);

export type WidgetPreviewResponse = v.InferOutput<
	typeof widgetPreviewResponseSchema
>;

export type WidgetPreview<K extends WidgetPreviewResponse["kind"]> = Extract<
	WidgetPreviewResponse,
	{ kind: K }
>["data"];
