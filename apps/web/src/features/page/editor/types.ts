import type {
	CalendlyEventType,
	ItemType,
	PageItemUpsert,
	RssFeedResponse,
	WidgetPreview,
} from "@grabbin/api";
import type { WidgetType } from "@grabbin/page-link";

export type { BentoCommand, WidgetContent } from "../bento-command";

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
