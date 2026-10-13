import type {
	CalendlyEventType,
	ItemType,
	PageItemLinkMetadata,
	RssFeedResponse,
} from "@grabbin/api";
import { createContext, useContext } from "react";

export type AdvancedWidgetActions = {
	onItemAdd: (itemType: Exclude<ItemType, "calendly">, url?: string) => void;
	onCalendlyAdd: (event: CalendlyEventType) => Promise<void>;
	onRssFeedAdd: (url: string) => Promise<boolean>;
	onRssFeedPreview: (url: string) => Promise<RssFeedResponse>;
	onSpotifyPreview: (url: string) => Promise<PageItemLinkMetadata>;
	onSpotifyAdd: (
		url: string,
		metadata: PageItemLinkMetadata,
	) => Promise<boolean>;
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
