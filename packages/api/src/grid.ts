import * as v from "valibot";

export const itemTypeSchema = v.union([
	v.literal("text"),
	v.literal("media"),
	v.literal("map"),
	v.literal("section"),
	v.literal("link"),
	v.literal("calendly"),
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

const optionalTrimmedLinkSchema = v.pipe(
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
	link: optionalTrimmedLinkSchema,
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

export const pageItemMediaDataSchema = v.object({
	objectKey: v.pipe(v.string(), v.minLength(1)),
	mimeType: v.pipe(
		v.string(),
		v.regex(/^(image|video)\/[a-z0-9.+-]+$/i, "Media MIME type required."),
	),
	placeholderDataUrl: pageItemImagePlaceholderSchema,
	caption: v.optional(v.string()),
	link: optionalTrimmedLinkSchema,
	crop: v.optional(pageItemMediaCropSchema),
});

export const pageItemMediaResponseDataSchema = v.object({
	...pageItemMediaDataSchema.entries,
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

export const pageItemLinkMetadataSchema = v.object({
	title: v.optional(v.string()),
	description: v.optional(v.string()),
	faviconUrl: v.optional(faviconUrlSchema),
	imageUrl: v.optional(httpsUrlSchema),
	provider: v.optional(v.string()),
	providerData: v.optional(
		v.record(
			v.string(),
			v.union([
				v.string(),
				v.number(),
				v.boolean(),
				v.null(),
				v.array(httpsUrlSchema),
			]),
		),
	),
});

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

export const pageItemLinkResponseMetadataSchema = v.object({
	...pageItemLinkMetadataSchema.entries,
	presentation: v.optional(pageItemLinkPresentationSchema),
});

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

export function createInitialLinkMetadata(value: string) {
	const parsed = new URL(value);
	const hostname = parsed.hostname.replace(/^www\./, "");
	const path = parsed.pathname.replace(/^\//, "").replace(/\/$/, "");
	return {
		title: path ? `${hostname}/${path}` : hostname,
		faviconUrl: `https://icons.duckduckgo.com/ip3/${hostname}.ico`,
	} satisfies v.InferOutput<typeof pageItemLinkMetadataSchema>;
}

export const pageItemDataSchemas = {
	text: pageItemTextDataSchema,
	media: pageItemMediaDataSchema,
	map: pageItemMapDataSchema,
	section: pageItemSectionDataSchema,
	link: pageItemLinkDataSchema,
	calendly: pageItemCalendlyDataSchema,
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
