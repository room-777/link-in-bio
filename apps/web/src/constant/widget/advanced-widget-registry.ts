import type {
	CalendlyEventType,
	PageItemLinkMetadata,
	RssFeedResponse,
} from "@grabbin/api";
import { providerDefinitions, providerIconUrl } from "@grabbin/page-link";
import { type ComponentType, createElement } from "react";
import { RssAdvancedWidgetPreview } from "@/components/page/editor/advanced-widgets/rss-feed/rss-advanced-widget-preview";
import RssFeedWidgetDetails from "@/components/page/editor/advanced-widgets/rss-feed/rss-feed-widget-details";
import { SpotifyAdvancedWidgetPreview } from "@/components/page/editor/advanced-widgets/spotify/spotify-advanced-widget-preview";
import SpotifyWidgetDetails from "@/components/page/editor/advanced-widgets/spotify/spotify-widget-details";
import { TweetAdvancedWidgetPreview } from "@/components/page/editor/advanced-widgets/tweet/tweet-advanced-widget-preview";
import TweetWidgetDetails from "@/components/page/editor/advanced-widgets/tweet/tweet-widget-details";
import { CalendlyAdvancedWidgetPreview } from "@/features/calendly/components/widget/calendly-advanced-widget-preview";
import CalendlyWidgetDetails from "@/features/calendly/components/widget/calendly-widget-details";

type AdvancedWidgetDetailsProps = {
	onAdd: (event: CalendlyEventType) => Promise<void>;
	onRssFeedAdd: (url: string) => Promise<boolean>;
	onSpotifyAdd: (
		url: string,
		metadata: PageItemLinkMetadata,
	) => Promise<boolean>;
	spotifyPreview?: { url: string; metadata: PageItemLinkMetadata };
	spotifyPreviewError?: boolean;
	onTweetAdd: (url: string) => Promise<boolean>;
	onInputChange?: (value: string) => void;
	badges: AdvancedWidgetModule["badges"];
};

type AdvancedWidgetPreviewProps = {
	inputValue?: string;
	rssFeed?: RssFeedResponse;
	spotifyPreview?: { url: string; metadata: PageItemLinkMetadata };
};

export type AdvancedWidgetModule = {
	id: string;
	label: string;
	iconUrl: string;
	iconFrame: boolean;
	brandColor?: string;
	badges: readonly { id: string; label: string; iconUrl: string }[];
	details: ComponentType<AdvancedWidgetDetailsProps>;
	preview: ComponentType<AdvancedWidgetPreviewProps>;
};

type ConfiguredProvider = (typeof providerDefinitions)[number];
type AdvancedWidgetProvider = Extract<
	ConfiguredProvider,
	{ advancedWidget: object }
>;
type AdvancedWidgetId = AdvancedWidgetProvider["id"];

const EmptyActivity = () => null;
const ComingSoonActivity = () =>
	createElement(
		"div",
		{
			className:
				"flex h-full items-center justify-center text-sm text-muted-foreground",
		},
		"Sipping coffee while crafting a polished widget...",
	);

const advancedWidgetDetails: Record<
	AdvancedWidgetId,
	ComponentType<AdvancedWidgetDetailsProps>
> = {
	calendly: CalendlyWidgetDetails,
	"rss-feed": RssFeedWidgetDetails,
	spotify: SpotifyWidgetDetails,
	soundcloud: ComingSoonActivity,
	"apple-music": ComingSoonActivity,
	signature: ComingSoonActivity,
	tweet: TweetWidgetDetails,
};

const advancedWidgetPreviews: Record<
	AdvancedWidgetId,
	ComponentType<AdvancedWidgetPreviewProps>
> = {
	calendly: CalendlyAdvancedWidgetPreview,
	"rss-feed": RssAdvancedWidgetPreview,
	spotify: SpotifyAdvancedWidgetPreview,
	soundcloud: EmptyActivity,
	"apple-music": EmptyActivity,
	signature: EmptyActivity,
	tweet: TweetAdvancedWidgetPreview,
};

const badgeProvider = (id: string) =>
	providerDefinitions.find((provider) => provider.id === id);
const hasIconFrame = (advancedWidget: {
	badgeProviderIds?: readonly string[];
	iconFrame?: boolean;
}) => advancedWidget.iconFrame !== false;

export const advancedWidgetModules: readonly AdvancedWidgetModule[] =
	providerDefinitions
		.filter(
			(provider): provider is AdvancedWidgetProvider =>
				"advancedWidget" in provider,
		)
		.map((provider) => {
			const { id } = provider;
			return {
				id,
				label: provider.label,
				iconUrl: provider.faviconUrl ?? providerIconUrl(id),
				iconFrame: hasIconFrame(provider.advancedWidget),
				brandColor:
					"brandColor" in provider.advancedWidget
						? provider.advancedWidget.brandColor
						: undefined,
				badges: provider.advancedWidget.badgeProviderIds.map((id) => {
					const badge = badgeProvider(id);
					return {
						id,
						label: badge?.label ?? id,
						iconUrl: badge?.faviconUrl ?? providerIconUrl(id),
					};
				}),
				details: advancedWidgetDetails[id],
				preview: advancedWidgetPreviews[id],
			};
		});
