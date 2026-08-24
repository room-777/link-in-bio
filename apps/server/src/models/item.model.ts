import {
	breakpointSchema,
	type ItemLayout,
	type ItemType,
	itemLayoutSchema,
	pageItemLayoutsSchema,
	pageItemLinkDataSchema,
	pageItemMapDataSchema,
	pageItemMediaDataSchema,
	pageItemSectionDataSchema,
	pageItemTextDataSchema,
	pageItemUpsertSchema,
} from "@grabbin/api/grid";
import * as v from "valibot";

export const itemDataSchemas = {
	text: pageItemTextDataSchema,
	media: pageItemMediaDataSchema,
	map: pageItemMapDataSchema,
	section: pageItemSectionDataSchema,
	link: pageItemLinkDataSchema,
} as const;

export const itemTypeRegistry = {
	text: {
		data: pageItemTextDataSchema,
		allowedPresets: [
			"halfBanner",
			"squareSmall",
			"landscape",
			"squareLarge",
			"portrait",
		],
	},
	media: {
		data: pageItemMediaDataSchema,
		allowedPresets: [
			"squareSmall",
			"landscape",
			"squareLarge",
			"portrait",
		],
	},
	map: {
		data: pageItemMapDataSchema,
		allowedPresets: [
			"squareSmall",
			"landscape",
			"squareLarge",
			"portrait",
		],
	},
	section: {
		data: pageItemSectionDataSchema,
		allowedPresets: ["fullBanner"],
	},
	link: {
		data: pageItemLinkDataSchema,
		allowedPresets: [
			"halfBanner",
			"squareSmall",
			"landscape",
			"squareLarge",
			"portrait",
		],
	},
} as const satisfies Record<
	ItemType,
	{
		data: v.GenericSchema;
		allowedPresets: readonly string[];
	}
>;

export const pageItemSchema =
	pageItemUpsertSchema;

export type PageItem = v.InferOutput<
	typeof pageItemSchema
>;

export const validatePageItemData = (
	type: ItemType,
	data: unknown,
) =>
	v.parse(
		itemTypeRegistry[type].data,
		data,
	);

export const validatePageItemLayout = (
	layouts: unknown,
): Record<
	"wide" | "compact",
	ItemLayout
> =>
	v.parse(
		pageItemLayoutsSchema,
		layouts,
	);

export const itemContractSchemas = {
	breakpoint: breakpointSchema,
	layout: itemLayoutSchema,
	layouts: pageItemLayoutsSchema,
	item: pageItemSchema,
} as const;
