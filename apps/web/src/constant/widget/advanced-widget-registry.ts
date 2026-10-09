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

const advancedWidgetDetails: Record<
	AdvancedWidgetId,
	ComponentType<AdvancedWidgetDetailsProps>
> = {
	calendly: CalendlyWidgetDetails,
	"rss-feed": RssFeedWidgetDetails,
};

const advancedWidgetPreviews: Record<AdvancedWidgetId, ComponentType> = {
	calendly: CalendlyAdvancedWidgetPreview,
	"rss-feed": RssAdvancedWidgetPreview,
};

const badgeProvider = (id: string) =>
	providerDefinitions.find((provider) => provider.id === id);

export const advancedWidgetModules: readonly AdvancedWidgetModule[] =
	providerDefinitions
		.filter(
			(provider): provider is AdvancedWidgetProvider =>
				"advancedWidget" in provider,
		)
		.map((provider) => ({
			id: provider.id,
			label: provider.label,
			iconUrl: provider.faviconUrl ?? `/api/provider-icons/${provider.id}.svg`,
			badges: provider.advancedWidget.badgeProviderIds.map((id) => {
				const badge = badgeProvider(id);
				return {
					id,
					label: badge?.label ?? id,
					iconUrl: badge?.faviconUrl ?? `/api/provider-icons/${id}.svg`,
				};
			}),
			details: advancedWidgetDetails[provider.id],
			preview: advancedWidgetPreviews[provider.id],
		}));
