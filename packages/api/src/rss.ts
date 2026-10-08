import * as v from "valibot";

const rssHttpsUrlSchema = v.pipe(
	v.string(),
	v.trim(),
	v.url(),
	v.check((value) => value.startsWith("https://"), "HTTPS URL required."),
);

export const rssPlatformSchema = v.picklist([
	"medium",
	"substack",
	"note",
	"ghost",
	"hashnode",
]);

export const rssSourceTypeSchema = v.picklist([
	"profile",
	"blog",
	"publication",
	"magazine",
]);

export const rssFeedItemSchema = v.object({
	id: v.pipe(v.string(), v.minLength(1)),
	title: v.pipe(v.string(), v.minLength(1)),
	url: rssHttpsUrlSchema,
	publishedAt: v.nullable(v.string()),
	updatedAt: v.nullable(v.string()),
	authors: v.array(v.string()),
	imageUrl: v.nullable(rssHttpsUrlSchema),
	tags: v.array(v.string()),
});

export const rssFeedResponseSchema = v.object({
	source: v.object({
		inputUrl: rssHttpsUrlSchema,
		feedUrl: rssHttpsUrlSchema,
		platform: rssPlatformSchema,
		type: rssSourceTypeSchema,
		iconUrl: v.pipe(
			v.string(),
			v.regex(
				/^\/api\/provider-icons\/(?:medium|substack|note|ghost|hashnode)\.(?:svg|webp)$/,
			),
		),
		title: v.nullable(v.string()),
	}),
	items: v.array(rssFeedItemSchema),
});

export type RssFeedResponse = v.InferOutput<typeof rssFeedResponseSchema>;
