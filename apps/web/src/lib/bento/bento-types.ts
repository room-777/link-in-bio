import type {
	CalendlyEventType,
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

export type BentoItem = PageItemResponse & {
	preset: PresetName | null;
};

export type BentoCommand =
	| { type: "add-item"; itemType: Exclude<ItemType, "calendly">; url?: string }
	| { type: "add-calendly-item"; event: CalendlyEventType }
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
