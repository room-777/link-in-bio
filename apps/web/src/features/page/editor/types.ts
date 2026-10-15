import type {
	CalendlyEventType,
	ItemType,
	PageItemResponse,
	PageItemStyle,
	PageItemUpsert,
	RssFeedResponse,
	WidgetPreview,
} from "@grabbin/api";
import type {
	BentoBreakpoint,
	BentoLayoutMap,
	PresetName,
} from "@grabbin/bento-layout";
import type { WidgetType } from "@grabbin/page-link";

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

export type AdvancedWidgetActions = {
	onItemAdd: (itemType: Exclude<ItemType, WidgetType>, url?: string) => void;
	onCalendlyAdd: (event: CalendlyEventType) => Promise<void>;
	onRssFeedAdd: (url: string) => Promise<boolean>;
	onRssFeedPreview: (url: string) => Promise<RssFeedResponse>;
	onSpotifyPreview: (url: string) => Promise<WidgetPreview<"spotify">>;
	onSpotifyAdd: (preview: WidgetPreview<"spotify">) => Promise<boolean>;
	onTweetAdd: (url: string) => Promise<boolean>;
	onMediaSelect: (file: File) => void;
};
