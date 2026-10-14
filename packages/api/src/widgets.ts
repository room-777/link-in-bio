import * as v from "valibot";
import {
	pageItemLinkUrlSchema,
	pageItemRssDataSchema,
	pageItemSpotifyDataSchema,
	pageItemTweetDataSchema,
} from "./grid";
import { rssFeedResponseSchema } from "./rss";

const indicesSchema = v.tuple([v.number(), v.number()]);
const tweetEntityListSchema = v.optional(
	v.array(v.looseObject({ indices: indicesSchema })),
);

/**
 * The react-tweet (X syndication) fields the Tweet widget renders. Other
 * fields are kept as they are because react-tweet's enrichTweet reads them.
 */
export const tweetPayloadSchema = v.looseObject({
	id_str: v.pipe(v.string(), v.regex(/^\d+$/)),
	text: v.string(),
	created_at: v.string(),
	display_text_range: indicesSchema,
	favorite_count: v.number(),
	user: v.looseObject({
		name: v.string(),
		screen_name: v.string(),
		profile_image_url_https: v.string(),
		verified: v.optional(v.boolean()),
		is_blue_verified: v.optional(v.boolean()),
	}),
	entities: v.optional(
		v.looseObject({
			hashtags: tweetEntityListSchema,
			urls: tweetEntityListSchema,
			user_mentions: tweetEntityListSchema,
			symbols: tweetEntityListSchema,
			media: tweetEntityListSchema,
		}),
	),
	photos: v.optional(v.array(v.looseObject({ url: v.string() }))),
	video: v.optional(
		v.looseObject({
			poster: v.optional(v.string()),
			variants: v.array(v.looseObject({ type: v.string(), src: v.string() })),
		}),
	),
});

export type TweetPayload = v.InferOutput<typeof tweetPayloadSchema>;

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
			tweet: tweetPayloadSchema,
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
