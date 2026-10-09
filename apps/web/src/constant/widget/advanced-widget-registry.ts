import type { CalendlyEventType } from "@grabbin/api";
import { providerDefinitions } from "@grabbin/page-link";
import type { ComponentType } from "react";
import CalendlyWidgetDetails from "@/components/page/editor/advanced-widgets/calendly/details";
import { CalendlyAdvancedWidgetPreview } from "@/components/page/editor/advanced-widgets/calendly/preview";
import RssFeedWidgetDetails from "@/components/page/editor/advanced-widgets/rss-feed/details";
import { RssAdvancedWidgetPreview } from "@/components/page/editor/advanced-widgets/rss-feed/preview";

type AdvancedWidgetDetailsProps = {
	onAdd: (event: CalendlyEventType) => Promise<void>;
	onRssFeedAdd: (url: string) => Promise<boolean>;
	badges: AdvancedWidgetModule["badges"];
};

export type AdvancedWidgetModule = {
	id: string;
	label: string;
	iconUrl: string;
	iconFrame: boolean;
	badges: readonly { id: string; label: string; iconUrl: string }[];
	details: ComponentType<AdvancedWidgetDetailsProps>;
	preview: ComponentType;
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
	x: EmptyActivity,
};

const advancedWidgetPreviews: Record<AdvancedWidgetId, ComponentType> = {
	calendly: CalendlyAdvancedWidgetPreview,
	"rss-feed": RssAdvancedWidgetPreview,
	spotify: EmptyActivity,
	soundcloud: EmptyActivity,
	"apple-music": EmptyActivity,
	signature: EmptyActivity,
	x: EmptyActivity,
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
			const label = id === "x" ? "X post" : provider.label;
			return {
				id,
				label,
				iconUrl: provider.faviconUrl ?? `/api/provider-icons/${id}.svg`,
				iconFrame: hasIconFrame(provider.advancedWidget),
				badges: provider.advancedWidget.badgeProviderIds.map((id) => {
					const badge = badgeProvider(id);
					return {
						id,
						label: badge?.label ?? id,
						iconUrl: badge?.faviconUrl ?? `/api/provider-icons/${id}.svg`,
					};
				}),
				details: advancedWidgetDetails[id],
				preview: advancedWidgetPreviews[id],
			};
		});
