import { providerDefinitions, providerIconUrl } from "@grabbin/page-link";
import { type ComponentType, createElement } from "react";
import CalendlyWidgetActivity from "@/features/calendly/components/widget/calendly-widget-activity";
import type { AdvancedWidgetActivityProps } from "@/features/page/editor/types";
import RssWidgetActivity from "@/features/rss/components/widget/rss-widget-activity";
import SpotifyWidgetActivity from "@/features/spotify/components/widget/spotify-widget-activity";
import TweetWidgetActivity from "@/features/tweet/components/widget/tweet-widget-activity";

export type AdvancedWidgetModule = {
	id: string;
	label: string;
	iconUrl: string;
	iconFrame: boolean;
	brandColor?: string;
	badges: readonly { id: string; label: string; iconUrl: string }[];
	activity: ComponentType<AdvancedWidgetActivityProps>;
};

type ConfiguredProvider = (typeof providerDefinitions)[number];
type AdvancedWidgetProvider = Extract<
	ConfiguredProvider,
	{ advancedWidget: object }
>;
type AdvancedWidgetId = AdvancedWidgetProvider["id"];

const ComingSoonActivity = () =>
	createElement(
		"div",
		{
			className:
				"flex h-full items-center justify-center text-sm text-muted-foreground",
		},
		"Sipping coffee while crafting a polished widget...",
	);

const advancedWidgetActivities: Record<
	AdvancedWidgetId,
	ComponentType<AdvancedWidgetActivityProps>
> = {
	calendly: CalendlyWidgetActivity,
	"rss-feed": RssWidgetActivity,
	spotify: SpotifyWidgetActivity,
	soundcloud: ComingSoonActivity,
	"apple-music": ComingSoonActivity,
	signature: ComingSoonActivity,
	tweet: TweetWidgetActivity,
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
				activity: advancedWidgetActivities[id],
			};
		});
