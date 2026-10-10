import type { CalendlyEventType } from "@grabbin/api";
import { providerDefinitions, providerIconUrl } from "@grabbin/page-link";
import type { ComponentType } from "react";
import CalendlyWidgetDetails from "@/components/page/editor/advanced-widgets/calendly/details";
import { CalendlyAdvancedWidgetPreview } from "@/components/page/editor/advanced-widgets/calendly/preview";
import RssFeedWidgetDetails from "@/components/page/editor/advanced-widgets/rss-feed/details";
import { RssAdvancedWidgetPreview } from "@/components/page/editor/advanced-widgets/rss-feed/preview";
import TweetWidgetDetails from "@/components/page/editor/advanced-widgets/tweet/details";
import { TweetAdvancedWidgetPreview } from "@/components/page/editor/advanced-widgets/tweet/preview";

type AdvancedWidgetDetailsProps = {
	onAdd: (event: CalendlyEventType) => Promise<void>;
	onRssFeedAdd: (url: string) => Promise<boolean>;
	onTweetAdd: (url: string) => Promise<boolean>;
	onTweetInputChange?: (value: string) => void;
	badges: AdvancedWidgetModule["badges"];
};

type AdvancedWidgetPreviewProps = {
	tweetInput?: string;
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

const advancedWidgetDetails: Record<
	AdvancedWidgetId,
	ComponentType<AdvancedWidgetDetailsProps>
> = {
	calendly: CalendlyWidgetDetails,
	"rss-feed": RssFeedWidgetDetails,
	spotify: EmptyActivity,
	soundcloud: EmptyActivity,
	"apple-music": EmptyActivity,
	signature: EmptyActivity,
	tweet: TweetWidgetDetails,
};

const advancedWidgetPreviews: Record<
	AdvancedWidgetId,
	ComponentType<AdvancedWidgetPreviewProps>
> = {
	calendly: CalendlyAdvancedWidgetPreview,
	"rss-feed": RssAdvancedWidgetPreview,
	spotify: EmptyActivity,
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
