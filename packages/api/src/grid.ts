import * as v from "valibot";

export const itemTypeSchema = v.union([
	v.literal("text"),
	v.literal("media"),
	v.literal("map"),
	v.literal("section"),
	v.literal("link"),
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

const httpsUrlSchema = v.pipe(
	v.string(),
	v.trim(),
	v.url(),
	v.check((value) => value.startsWith("https://"), "HTTPS URL required."),
);

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

export const pageItemMediaDataSchema = v.object({
	objectKey: v.pipe(v.string(), v.minLength(1)),
	mimeType: v.pipe(
		v.string(),
		v.regex(/^(image|video)\/[a-z0-9.+-]+$/i, "Media MIME type required."),
	),
	caption: v.optional(v.string()),
	link: optionalTrimmedLinkSchema,
});

export const pageItemMediaResponseDataSchema = v.object({
	...pageItemMediaDataSchema.entries,
	mediaUrl: v.optional(httpsUrlSchema),
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

export const pageItemLinkMetadataSchema = v.object({
	title: v.optional(v.string()),
	description: v.optional(v.string()),
	faviconUrl: v.optional(httpsUrlSchema),
	imageUrl: v.optional(httpsUrlSchema),
	provider: v.optional(v.string()),
});

export const pageItemLinkDataSchema = v.object({
	url: pageItemLinkUrlSchema,
	metadata: v.optional(pageItemLinkMetadataSchema),
});

export const pageItemDataSchemas = {
	text: pageItemTextDataSchema,
	media: pageItemMediaDataSchema,
	map: pageItemMapDataSchema,
	section: pageItemSectionDataSchema,
	link: pageItemLinkDataSchema,
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
	v.object({ type: v.literal("link"), data: pageItemLinkDataSchema }),
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
