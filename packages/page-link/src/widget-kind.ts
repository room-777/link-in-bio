import type { ItemType } from "@grabbin/api";
import { providerDefinitions } from "./provider-data";

/** Item types drawn by their own widget instead of a link card. */
export type WidgetType = Extract<
	ItemType,
	"rss" | "tweet" | "spotify" | "calendly"
>;

/** Whether the card border uses the neutral widget color. */
export const widgetNeutralBorder: Record<WidgetType, boolean> = {
	rss: true,
	tweet: true,
	spotify: false,
	calendly: true,
};

export function isWidgetType(type: ItemType): type is WidgetType {
	return Object.hasOwn(widgetNeutralBorder, type);
}

/**
 * Links to these providers will become widgets but have none yet, so a free
 * account cannot add them. A Spotify URL stays a plain, free link.
 */
const comingSoonWidgetProviders = new Set<string>(
	providerDefinitions
		.filter((provider) => "advancedWidget" in provider)
		.map((provider) => provider.id)
		.filter((id) => id !== "spotify"),
);

/** `linkProvider` is the saved provider of a link item. */
export function requiresProPlan(type: ItemType, linkProvider?: string) {
	return (
		isWidgetType(type) ||
		(type === "link" && comingSoonWidgetProviders.has(linkProvider ?? ""))
	);
}
