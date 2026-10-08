import type { CalendlyEventType } from "@grabbin/api";
import type { LinkProviderId } from "@grabbin/page-link";
import { providerDefinitions } from "@grabbin/page-link";
import type { ComponentType } from "react";
import CalendlyWidgetDetails from "@/components/page/editor/calendly-widget-details";

const widgetCategoryNames = ["Scheduling"] as const;
type WidgetCategory = (typeof widgetCategoryNames)[number];

export type AdvancedWidgetModule = {
	providerId: Exclude<LinkProviderId, "generic-web">;
	category: WidgetCategory;
	details?: ComponentType<{ onAdd: (event: CalendlyEventType) => void }>;
};

export const advancedWidgetModules = [
	{
		providerId: "calendly",
		category: "Scheduling",
		details: CalendlyWidgetDetails,
	},
] satisfies readonly AdvancedWidgetModule[];

const categories = [
	...new Set(advancedWidgetModules.map(({ category }) => category)),
];
const providersById = new Map(
	providerDefinitions.map((provider) => [provider.id, provider]),
);

export const advancedWidgetCategories = categories.map((category) => ({
	name: category,
	providers: advancedWidgetModules
		.filter((widget) => widget.category === category)
		.flatMap((widget) => {
			const provider = providersById.get(widget.providerId);
			return provider ? [{ ...provider, details: widget.details }] : [];
		}),
}));
