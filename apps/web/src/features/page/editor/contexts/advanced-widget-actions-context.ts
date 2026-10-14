import type {
	CalendlyEventType,
	ItemType,
	RssFeedResponse,
	WidgetPreview,
} from "@grabbin/api";
import type { WidgetType } from "@grabbin/page-link";
import { createContext, useContext } from "react";

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

export const AdvancedWidgetActionsContext =
	createContext<AdvancedWidgetActions | null>(null);

export function useAdvancedWidgetActions() {
	const actions = useContext(AdvancedWidgetActionsContext);
	if (!actions) throw new Error("Advanced widget actions are unavailable.");
	return actions;
}
