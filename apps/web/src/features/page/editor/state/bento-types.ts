import type {
	ItemType,
	PageItemResponse,
	PageItemStyle,
	PageItemUpsert,
} from "@grabbin/api";
import type {
	BentoBreakpoint,
	BentoLayoutMap,
	PresetName,
} from "@grabbin/bento-layout";
import type { WidgetType } from "@grabbin/page-link";

export type BentoItem = PageItemResponse & {
	preset: PresetName | null;
};

/** A widget item to add, with the data it saves. */
export type WidgetContent = {
	[T in WidgetType]: Pick<
		Extract<PageItemResponse, { type: T }>,
		"type" | "data"
	>;
}[WidgetType];

export type BentoCommand =
	| { type: "add-item"; itemType: Exclude<ItemType, WidgetType>; url?: string }
	| { type: "add-widget"; widget: WidgetContent }
	| {
			type: "replace-layout";
			breakpoint: BentoBreakpoint;
			layout: BentoLayoutMap;
	  }
	| {
			type: "apply-preset";
			itemId: string;
			breakpoint: BentoBreakpoint;
			preset: PresetName;
	  }
	| { type: "update-data"; itemId: string; data: PageItemResponse["data"] }
	| { type: "update-style"; itemId: string; patch: PageItemStyle }
	| { type: "delete-item"; itemId: string };

export type BentoBatchItem = PageItemUpsert;
