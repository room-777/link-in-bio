import * as v from "valibot";
import { rssFeedResponseSchema } from "./rss";

export const itemTypeSchema = v.union([
	v.literal("text"),
	v.literal("media"),
	v.literal("map"),
	v.literal("section"),
	v.literal("link"),
	v.literal("calendly"),
	v.literal("rss"),
	v.literal("tweet"),
	v.literal("spotify"),
]);

export type ItemType = v.InferOutput<typeof itemTypeSchema>;

export const breakpointSchema = v.union([
	v.literal("wide"),
	v.literal("compact"),
]);

export type Breakpoint = v.InferOutput<typeof breakpointSchema>;

export const itemLayoutSchema = v.object({
	x: v.pipe(v.number(), v.integer(), v.minValue(0)),
	y: v.pipe(v.number(), v.integer(), v.minValue(0)),
	w: v.pipe(v.number(), v.integer(), v.minValue(1)),
	h: v.pipe(v.number(), v.integer(), v.minValue(1)),
});

export type ItemLayout = v.InferOutput<typeof itemLayoutSchema>;

export const pageItemLayoutsSchema = v.object({
	wide: itemLayoutSchema,
	compact: itemLayoutSchema,
});

export type PageItemLayouts = v.InferOutput<typeof pageItemLayoutsSchema>;

const pageItemBackgroundColorSchema = v.pipe(
	v.string(),
	v.trim(),
	v.check(
		(value) =>
			/^#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(value) ||
			/^bg-(?:transparent|current|inherit|black|white|primary|secondary|background|foreground|muted|accent|destructive|input|ring|brand-[a-z0-9-]+|(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(?:50|100|200|300|400|500|600|700|800|900|950))(?:\/(?:0|5|10|20|25|30|40|50|60|70|75|80|90|95|100))?$/.test(
				value,
			),
		"Use a hex color or Tailwind background color token.",
	),
);

export const pageItemStyleSchema = v.strictObject({
	textAlign: v.optional(v.picklist(["left", "center", "right"])),
	verticalAlign: v.optional(v.picklist(["top", "center", "bottom"])),
	backgroundColor: v.optional(pageItemBackgroundColorSchema),
});
export type PageItemStyle = v.InferOutput<typeof pageItemStyleSchema>;

export const normalizedCropSchema = v.pipe(
	v.object({
		x: v.pipe(v.number(), v.minValue(0), v.maxValue(100)),
		y: v.pipe(v.number(), v.minValue(0), v.maxValue(100)),
		width: v.pipe(v.number(), v.minValue(0.1), v.maxValue(100)),
		height: v.pipe(v.number(), v.minValue(0.1), v.maxValue(100)),
	}),
	v.check(
		(crop) => crop.x + crop.width <= 100 && crop.y + crop.height <= 100,
		"Crop must stay within the media bounds.",
	),
);

export type NormalizedCrop = v.InferOutput<typeof normalizedCropSchema>;

const pageItemMediaCropSchema = v.object({
	wide: v.optional(normalizedCropSchema),
	compact: v.optional(normalizedCropSchema),
});

const httpsUrlSchema = v.pipe(
	v.string(),
	v.trim(),
	v.url(),
	v.check((value) => value.startsWith("https://"), "HTTPS URL required."),
);

const mediaDeliveryUrlSchema = v.pipe(
	v.string(),
	v.trim(),
	v.url(),
	v.check((value) => {
		try {
			const url = new URL(value);
			return (
				url.protocol === "https:" ||
				(url.protocol === "http:" &&
					["localhost", "127.0.0.1"].includes(url.hostname) &&
					url.pathname.startsWith("/media/users/") &&
					!url.username &&
					!url.password &&
					!url.search &&
					!url.hash)
			);
		} catch {
			return false;
		}
	}, "HTTPS or local media URL required."),
);

const faviconUrlSchema = v.union([
	httpsUrlSchema,
	v.pipe(
		v.string(),
		v.trim(),
		v.regex(/^\/api\/provider-icons\/[a-z0-9-]+\.(?:svg|webp)$/i),
	),
]);

export const pageItemLinkUrlSchema = httpsUrlSchema;

const optionalTrimmedUrlSchema = v.pipe(
	v.optional(v.string()),
	v.transform((value) => value?.trim() || undefined),
	v.check((value) => {
		if (value === undefined) return true;

		try {
			return new URL(value).protocol === "https:";
		} catch {
			return false;
		}
	}, "HTTPS URL required."),
);

export const pageItemTextDataSchema = v.object({
	text: v.pipe(v.string(), v.trim()),
	url: optionalTrimmedUrlSchema,
});

const pageItemImagePlaceholderSchema = v.optional(
	v.pipe(
		v.string(),
		v.maxLength(8_192),
		v.regex(
			/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/,
			"Media placeholder must be a small JPEG data URL.",
		),
	),
);

const pageItemMediaDataFields = {
	objectKey: v.pipe(v.string(), v.minLength(1)),
	mimeType: v.pipe(
		v.string(),
		v.regex(/^(image|video)\/[a-z0-9.+-]+$/i, "Media MIME type required."),
	),
	placeholderDataUrl: pageItemImagePlaceholderSchema,
	caption: v.optional(v.string()),
	url: optionalTrimmedUrlSchema,
	crop: v.optional(pageItemMediaCropSchema),
};

export const pageItemMediaDataSchema = v.object(pageItemMediaDataFields);

export const pageItemMediaResponseDataSchema = v.object({
	...pageItemMediaDataFields,
	mediaUrl: v.optional(mediaDeliveryUrlSchema),
});

export const pageItemMapDataSchema = v.object({
	latitude: v.pipe(v.number(), v.minValue(-90), v.maxValue(90)),
	longitude: v.pipe(v.number(), v.minValue(-180), v.maxValue(180)),
	zoom: v.optional(v.pipe(v.number(), v.minValue(0), v.maxValue(22))),
	caption: v.optional(v.string()),
});

export const pageItemSectionDataSchema = v.object({
	title: v.pipe(v.string(), v.trim()),
});

export const pageItemCalendlyDataSchema = v.object({
	eventTypeUri: v.pipe(
		v.string(),
		v.regex(/^https:\/\/api\.calendly\.com\/event_types\/[A-Za-z0-9_-]+$/),
	),
	schedulingUrl: v.pipe(
		v.string(),
		v.url(),
		v.check((value) => {
			try {
				const url = new URL(value);
				return url.protocol === "https:" && url.hostname === "calendly.com";
			} catch {
				return false;
			}
		}, "Valid Calendly scheduling URL required."),
	),
});

const followerFields = {
	followerCount: v.optional(v.number()),
	followerCountLabel: v.optional(v.string()),
	followerCountApproximate: v.optional(v.boolean()),
};
const followingFields = {
	followingCount: v.optional(v.number()),
	followingCountLabel: v.optional(v.string()),
	followingCountApproximate: v.optional(v.boolean()),
};
const creatorFields = {
	authorName: v.optional(v.string()),
	authorProfileUrl: v.optional(v.string()),
	authorProfileImageUrl: v.optional(httpsUrlSchema),
};
const tweetAuthorImageUrlSchema = v.union([
	httpsUrlSchema,
	v.pipe(v.string(), v.regex(/^\/images\/[a-z0-9/_-]+\.(?:png|jpe?g|webp)$/i)),
]);

const spotifyTrackDataSchema = v.object({
	artist: v.string(),
	duration: v.optional(v.number()),
	name: v.string(),
	previewUrl: v.optional(httpsUrlSchema),
	uri: v.string(),
});

const spotifyColorSchema = v.object({
	alpha: v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(255)),
	red: v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(255)),
	green: v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(255)),
	blue: v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(255)),
});

const spotifyProviderDataSchema = v.object({
	type: v.optional(
		v.picklist(["album", "artist", "episode", "playlist", "track"]),
	),
	date: v.optional(v.string()),
	track: v.optional(v.string()),
	artist: v.optional(v.string()),
	audio: v.optional(httpsUrlSchema),
	link: v.optional(httpsUrlSchema),
	embed: v.optional(httpsUrlSchema),
	tracks: v.optional(v.pipe(v.array(spotifyTrackDataSchema), v.maxLength(100))),
	primaryColor: v.optional(v.pipe(v.string(), v.regex(/^#[\da-f]{6}$/i))),
	visualIdentity: v.optional(
		v.object({
			backgroundBase: v.optional(spotifyColorSchema),
			backgroundTintedBase: v.optional(spotifyColorSchema),
			textBase: v.optional(spotifyColorSchema),
			textBrightAccent: v.optional(spotifyColorSchema),
			textSubdued: v.optional(spotifyColorSchema),
		}),
	),
});

export const providerDataSchema = v.object({
	x: v.optional(
		v.object({
			...followerFields,
			...followingFields,
			mediaCount: v.optional(v.number()),
			verifiedMark: v.optional(v.boolean()),
		}),
	),
	instagram: v.optional(
		v.object({
			...followerFields,
			...followingFields,
			mediaCount: v.optional(v.number()),
			profileImageUrl: v.optional(httpsUrlSchema),
			recentPostThumbnailUrls: v.optional(v.array(httpsUrlSchema)),
		}),
	),
	threads: v.optional(v.object({ ...followerFields })),
	tiktok: v.optional(
		v.object({
			...followerFields,
			...followingFields,
			likeCount: v.optional(v.number()),
			profileImageUrl: v.optional(httpsUrlSchema),
		}),
	),
	facebook: v.optional(
		v.object({ ...followerFields, talkingAboutCount: v.optional(v.number()) }),
	),
	linkedin: v.optional(v.object({ ...followerFields })),
	github: v.optional(
		v.object({
			followers: v.optional(v.number()),
			githubUsername: v.optional(v.string()),
			githubContributionGraph: v.optional(v.string()),
		}),
	),
	youtube: v.optional(
		v.object({
			subscriberCount: v.optional(v.number()),
			viewCount: v.optional(v.number()),
			likeCount: v.optional(v.number()),
			commentCount: v.optional(v.number()),
			channelImageUrl: v.optional(httpsUrlSchema),
			recentVideoThumbnailUrls: v.optional(v.array(httpsUrlSchema)),
		}),
	),
	"youtube-music": v.optional(
		v.object({
			subscriberCount: v.optional(v.number()),
			viewCount: v.optional(v.number()),
			likeCount: v.optional(v.number()),
			commentCount: v.optional(v.number()),
			channelImageUrl: v.optional(httpsUrlSchema),
			recentVideoThumbnailUrls: v.optional(v.array(httpsUrlSchema)),
		}),
	),
	discord: v.optional(
		v.object({
			guildId: v.optional(v.string()),
			inviteCode: v.optional(v.string()),
			memberCount: v.optional(v.number()),
			onlineMemberCount: v.optional(v.number()),
		}),
	),
	chzzk: v.optional(
		v.object({
			...followerFields,
			channelId: v.optional(v.string()),
			isLive: v.optional(v.boolean()),
			liveId: v.optional(v.string()),
			liveViewerCount: v.optional(v.number()),
			liveThumbnailUrl: v.optional(httpsUrlSchema),
			channelImageUrl: v.optional(httpsUrlSchema),
			verifiedMark: v.optional(v.boolean()),
		}),
	),
	soop: v.optional(v.object({ favoriteCount: v.optional(v.number()) })),
	twitch: v.optional(
		v.object({
			...followerFields,
			channelId: v.optional(v.string()),
			isLive: v.optional(v.boolean()),
			liveViewerCount: v.optional(v.number()),
			liveThumbnailUrl: v.optional(httpsUrlSchema),
			profileImageUrl: v.optional(httpsUrlSchema),
		}),
	),
	"product-hunt": v.optional(v.object({ upvoteCount: v.optional(v.number()) })),
	pinterest: v.optional(
		v.object({
			...followerFields,
			...creatorFields,
			ownerName: v.optional(v.string()),
			ownerProfileImageUrl: v.optional(httpsUrlSchema),
			profileImageUrl: v.optional(httpsUrlSchema),
			likeCount: v.optional(v.number()),
			likeCountLabel: v.optional(v.string()),
			likeCountApproximate: v.optional(v.boolean()),
			favoriteCount: v.optional(v.number()),
			recentBoardThumbnailUrls: v.optional(v.array(httpsUrlSchema)),
		}),
	),
	behance: v.optional(
		v.object({
			...followerFields,
			...creatorFields,
			recentProjectThumbnailUrls: v.optional(v.array(httpsUrlSchema)),
		}),
	),
	dribbble: v.optional(
		v.object({
			...followerFields,
			...followingFields,
			...creatorFields,
			likeCount: v.optional(v.number()),
			profileImageUrl: v.optional(httpsUrlSchema),
			recentShotThumbnailUrls: v.optional(v.array(httpsUrlSchema)),
		}),
	),
	spotify: v.optional(spotifyProviderDataSchema),
});

export type ProviderData = v.InferOutput<typeof providerDataSchema>;
export type ProviderDataProvider = keyof ProviderData;

const legacyProviderDataSchema = v.object({
	followerCount: v.optional(v.nullable(v.number())),
	followerCountLabel: v.optional(v.nullable(v.string())),
	followerCountApproximate: v.optional(v.nullable(v.boolean())),
	followingCount: v.optional(v.nullable(v.number())),
	followingCountLabel: v.optional(v.nullable(v.string())),
	followingCountApproximate: v.optional(v.nullable(v.boolean())),
	mediaCount: v.optional(v.nullable(v.number())),
	subscriberCount: v.optional(v.nullable(v.number())),
	viewCount: v.optional(v.nullable(v.number())),
	likeCount: v.optional(v.nullable(v.number())),
	likeCountLabel: v.optional(v.nullable(v.string())),
	likeCountApproximate: v.optional(v.nullable(v.boolean())),
	commentCount: v.optional(v.nullable(v.number())),
	talkingAboutCount: v.optional(v.nullable(v.number())),
	favoriteCount: v.optional(v.nullable(v.number())),
	upvoteCount: v.optional(v.nullable(v.number())),
	followers: v.optional(v.nullable(v.number())),
	memberCount: v.optional(v.nullable(v.number())),
	onlineMemberCount: v.optional(v.nullable(v.number())),
	liveViewerCount: v.optional(v.nullable(v.number())),
	verifiedMark: v.optional(v.nullable(v.boolean())),
	isLive: v.optional(v.nullable(v.boolean())),
	channelId: v.optional(v.nullable(v.string())),
	guildId: v.optional(v.nullable(v.string())),
	inviteCode: v.optional(v.nullable(v.string())),
	liveId: v.optional(v.nullable(v.string())),
	githubUsername: v.optional(v.nullable(v.string())),
	authorName: v.optional(v.nullable(v.string())),
	authorProfileUrl: v.optional(v.nullable(v.string())),
	authorProfileImageUrl: v.optional(v.nullable(httpsUrlSchema)),
	ownerName: v.optional(v.nullable(v.string())),
	ownerProfileImageUrl: v.optional(v.nullable(httpsUrlSchema)),
	profileImageUrl: v.optional(v.nullable(httpsUrlSchema)),
	channelImageUrl: v.optional(v.nullable(httpsUrlSchema)),
	liveThumbnailUrl: v.optional(v.nullable(httpsUrlSchema)),
	recentPostThumbnailUrls: v.optional(v.nullable(v.array(httpsUrlSchema))),
	recentVideoThumbnailUrls: v.optional(v.nullable(v.array(httpsUrlSchema))),
	recentProjectThumbnailUrls: v.optional(v.nullable(v.array(httpsUrlSchema))),
	recentShotThumbnailUrls: v.optional(v.nullable(v.array(httpsUrlSchema))),
	recentBoardThumbnailUrls: v.optional(v.nullable(v.array(httpsUrlSchema))),
	githubContributionGraph: v.optional(v.nullable(v.string())),
});

export function normalizeProviderData(
	value: unknown,
	provider?: string,
): ProviderData | undefined {
	if (typeof value !== "object" || value === null || Array.isArray(value))
		return undefined;
	const record = value as Record<string, unknown>;
	if (Object.keys(providerDataSchema.entries).some((key) => key in record)) {
		const normalized = v.parse(providerDataSchema, record);
		return Object.values(normalized).some(
			(data) => data !== undefined && Object.keys(data).length > 0,
		)
			? normalized
			: undefined;
	}
	const legacy = v.parse(legacyProviderDataSchema, record);
	const data = Object.fromEntries(
		Object.entries(legacy).filter(
			([, item]) => item !== null && item !== undefined,
		),
	);
	if (
		!provider ||
		!Object.hasOwn(providerDataSchema.entries, provider) ||
		!Object.keys(data).length
	)
		return undefined;
	return v.parse(providerDataSchema, { [provider]: data });
}

const pageItemLinkMetadataEntries = {
	title: v.optional(v.string()),
	description: v.optional(v.string()),
	faviconUrl: v.optional(faviconUrlSchema),
	imageUrl: v.optional(httpsUrlSchema),
	provider: v.optional(v.string()),
	providerData: v.optional(v.unknown()),
};

function normalizeLinkMetadata<
	T extends { provider?: string; providerData?: unknown },
>(metadata: T): Omit<T, "providerData"> & { providerData?: ProviderData } {
	const { providerData: rawProviderData, ...rest } = metadata;
	const providerData = normalizeProviderData(
		rawProviderData,
		metadata.provider,
	);
	return {
		...rest,
		...(providerData ? { providerData } : {}),
	};
}

export const pageItemLinkMetadataSchema = v.pipe(
	v.object(pageItemLinkMetadataEntries),
	v.transform(normalizeLinkMetadata),
);

export type PageItemLinkMetadata = v.InferOutput<
	typeof pageItemLinkMetadataSchema
>;

const pageItemLinkPresentationColorSchema = v.pipe(
	v.string(),
	v.regex(
		/^#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i,
		"Hex color required.",
	),
);

export const pageItemLinkPresentationSchema = v.object({
	provider: v.pipe(v.string(), v.minLength(1)),
	providerLabel: v.pipe(v.string(), v.minLength(1)),
	faviconBackground: v.optional(pageItemLinkPresentationColorSchema),
	cardBackground: v.optional(pageItemLinkPresentationColorSchema),
	actionBackground: v.optional(pageItemLinkPresentationColorSchema),
	actionText: v.optional(pageItemLinkPresentationColorSchema),
	actionLabel: v.optional(v.pipe(v.string(), v.minLength(1))),
	actionVariant: v.optional(v.picklist(["solid", "outline"])),
	actionDetail: v.optional(v.pipe(v.string(), v.minLength(1))),
	actionIcon: v.optional(v.picklist(["upvote", "like2"])),
	imageUrls: v.optional(v.array(mediaDeliveryUrlSchema)),
	githubContributionGraph: v.optional(v.string()),
});

export type PageItemLinkPresentation = v.InferOutput<
	typeof pageItemLinkPresentationSchema
>;

export const pageItemLinkResponseMetadataSchema = v.pipe(
	v.object({
		...pageItemLinkMetadataEntries,
		presentation: v.optional(pageItemLinkPresentationSchema),
	}),
	v.transform(normalizeLinkMetadata),
);

export const pageItemLinkResponseDataSchema = v.object({
	url: pageItemLinkUrlSchema,
	imageKey: v.optional(v.nullable(v.pipe(v.string(), v.maxLength(512)))),
	imagePlaceholderDataUrl: pageItemImagePlaceholderSchema,
	metadata: v.optional(pageItemLinkResponseMetadataSchema),
});

export const pageItemLinkDataSchema = v.object({
	url: pageItemLinkUrlSchema,
	imageKey: v.optional(v.nullable(v.pipe(v.string(), v.maxLength(512)))),
	imagePlaceholderDataUrl: pageItemImagePlaceholderSchema,
	metadata: v.optional(pageItemLinkMetadataSchema),
});

export const pageItemRssDataSchema = v.object({
	url: pageItemLinkUrlSchema,
	title: v.optional(v.string()),
	feed: v.optional(rssFeedResponseSchema),
});

export const pageItemTweetDataSchema = v.object({
	url: pageItemLinkUrlSchema,
	authorName: v.optional(v.string()),
	authorProfileUrl: v.optional(v.string()),
	authorProfileImageUrl: v.optional(tweetAuthorImageUrlSchema),
	/** The react-tweet payload saved when the widget was added. */
	tweet: v.optional(v.unknown()),
});

export const pageItemSpotifyDataSchema = v.object({
	url: pageItemLinkUrlSchema,
	title: v.optional(v.string()),
	imageUrl: v.optional(httpsUrlSchema),
	spotify: v.optional(spotifyProviderDataSchema),
});

export function createInitialLinkMetadata(value: string) {
	const parsed = new URL(value);
	const hostname = parsed.hostname.replace(/^www\./, "");
	const path = parsed.pathname.replace(/^\//, "").replace(/\/$/, "");
	return {
		title: path ? `${hostname}/${path}` : hostname,
	} satisfies v.InferOutput<typeof pageItemLinkMetadataSchema>;
}

export const pageItemDataSchemas = {
	text: pageItemTextDataSchema,
	media: pageItemMediaDataSchema,
	map: pageItemMapDataSchema,
	section: pageItemSectionDataSchema,
	link: pageItemLinkDataSchema,
	calendly: pageItemCalendlyDataSchema,
	rss: pageItemRssDataSchema,
	tweet: pageItemTweetDataSchema,
	spotify: pageItemSpotifyDataSchema,
} as const;

const pageItemResponseBaseSchema = v.object({
	id: v.pipe(v.string(), v.minLength(1)),
	style: pageItemStyleSchema,
	layouts: pageItemLayoutsSchema,
	createdAt: v.string(),
	updatedAt: v.string(),
});

const pageItemResponseVariantSchema = v.variant("type", [
	v.object({ type: v.literal("text"), data: pageItemTextDataSchema }),
	v.object({ type: v.literal("media"), data: pageItemMediaResponseDataSchema }),
	v.object({ type: v.literal("map"), data: pageItemMapDataSchema }),
	v.object({ type: v.literal("section"), data: pageItemSectionDataSchema }),
	v.object({
		type: v.literal("link"),
		data: pageItemLinkResponseDataSchema,
	}),
	v.object({
		type: v.literal("calendly"),
		data: pageItemCalendlyDataSchema,
	}),
	v.object({ type: v.literal("rss"), data: pageItemRssDataSchema }),
	v.object({ type: v.literal("tweet"), data: pageItemTweetDataSchema }),
	v.object({ type: v.literal("spotify"), data: pageItemSpotifyDataSchema }),
]);

export const pageItemResponseSchema = v.intersect([
	pageItemResponseBaseSchema,
	pageItemResponseVariantSchema,
]);

export type PageItemResponse = v.InferOutput<typeof pageItemResponseSchema>;

const pageItemUpsertBaseSchema = v.object({
	id: v.pipe(v.string(), v.minLength(1)),
	style: pageItemStyleSchema,
	layouts: pageItemLayoutsSchema,
	updatedAt: v.optional(v.string()),
});

export const pageItemUpsertSchema = v.intersect([
	pageItemUpsertBaseSchema,
	v.variant("type", [
		v.object({ type: v.literal("text"), data: pageItemTextDataSchema }),
		v.object({ type: v.literal("media"), data: pageItemMediaDataSchema }),
		v.object({ type: v.literal("map"), data: pageItemMapDataSchema }),
		v.object({ type: v.literal("section"), data: pageItemSectionDataSchema }),
		v.object({ type: v.literal("link"), data: pageItemLinkDataSchema }),
		v.object({ type: v.literal("calendly"), data: pageItemCalendlyDataSchema }),
		v.object({ type: v.literal("rss"), data: pageItemRssDataSchema }),
		v.object({ type: v.literal("tweet"), data: pageItemTweetDataSchema }),
		v.object({ type: v.literal("spotify"), data: pageItemSpotifyDataSchema }),
	]),
]);

export type PageItemUpsert = v.InferOutput<typeof pageItemUpsertSchema>;

export function hasPageItemContent(item: PageItemUpsert): boolean {
	switch (item.type) {
		case "text":
			return item.data.text.trim().length > 0;
		case "section":
			return item.data.title.trim().length > 0;
		default:
			return true;
	}
}

export const pageItemBatchRequestSchema = v.object({
	upserts: v.array(pageItemUpsertSchema),
	deletes: v.array(v.pipe(v.string(), v.minLength(1))),
});

export type PageItemBatchRequest = v.InferOutput<
	typeof pageItemBatchRequestSchema
>;

export const pageItemBatchResponseSchema = v.object({
	items: v.array(pageItemResponseSchema),
});

export type PageItemBatchResponse = v.InferOutput<
	typeof pageItemBatchResponseSchema
>;

export const pageItemMetadataRequestSchema = v.object({
	itemId: v.pipe(v.string(), v.minLength(1)),
	url: pageItemLinkUrlSchema,
});

export type PageItemMetadataRequest = v.InferOutput<
	typeof pageItemMetadataRequestSchema
>;

export const pageItemMetadataResponseSchema = v.object({
	item: pageItemResponseSchema,
});

export type PageItemMetadataResponse = v.InferOutput<
	typeof pageItemMetadataResponseSchema
>;

export const pageItemUploadRequestSchema = v.object({
	contentType: v.pipe(
		v.string(),
		v.trim(),
		v.regex(/^(image|video)\/[a-z0-9.+-]+$/i, "Media MIME type required."),
	),
	size: v.pipe(v.number(), v.integer(), v.minValue(1)),
	itemId: v.optional(v.pipe(v.string(), v.minLength(1), v.maxLength(128))),
	kind: v.optional(v.literal("link-image")),
});

export type PageItemUploadRequest = v.InferOutput<
	typeof pageItemUploadRequestSchema
>;

export const pageItemUploadResponseSchema = v.object({
	objectKey: v.pipe(v.string(), v.minLength(1)),
	uploadUrl: v.pipe(v.string(), v.url()),
	expiresAt: v.string(),
});

export type PageItemUploadResponse = v.InferOutput<
	typeof pageItemUploadResponseSchema
>;

export const pageItemUploadCompleteRequestSchema = v.object({
	objectKey: v.pipe(v.string(), v.minLength(1)),
	itemId: v.optional(v.pipe(v.string(), v.minLength(1), v.maxLength(128))),
	kind: v.optional(v.literal("link-image")),
});

export type PageItemUploadCompleteRequest = v.InferOutput<
	typeof pageItemUploadCompleteRequestSchema
>;

export const pageItemUploadCancelRequestSchema = v.object({
	objectKey: v.pipe(v.string(), v.minLength(1)),
	itemId: v.optional(v.pipe(v.string(), v.minLength(1), v.maxLength(128))),
	kind: v.optional(v.literal("link-image")),
});

export type PageItemUploadCancelRequest = v.InferOutput<
	typeof pageItemUploadCancelRequestSchema
>;

export const pageItemUploadCompleteResponseSchema = v.object({
	objectKey: v.pipe(v.string(), v.minLength(1)),
	mimeType: v.pipe(v.string(), v.regex(/^(image|video)\//i)),
	size: v.pipe(v.number(), v.integer(), v.minValue(1)),
});

export type PageItemUploadCompleteResponse = v.InferOutput<
	typeof pageItemUploadCompleteResponseSchema
>;
