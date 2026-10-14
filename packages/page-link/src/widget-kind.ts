import type { ItemType } from "@grabbin/api";
import { getAllowedPresets, type PresetName } from "@grabbin/bento-layout";
import { providerDefinitions } from "./provider-data";

/**
 * Widgets with their own renderer. RSS and Tweet are link items marked by
 * `metadata.provider`. Spotify is a link item that also carries
 * `metadata.widget: "spotify"`; a Spotify URL without it is a plain link.
 * Calendly is its own item type.
 */
export type WidgetKind = "rss" | "tweet" | "spotify" | "calendly";

export type WidgetKindInput =
	| {
			type: "link";
			data: { metadata?: { provider?: string; widget?: "spotify" } };
	  }
	| { type: Exclude<ItemType, "link"> };

type WidgetRule = {
	/** Item type the widget is saved as; its sizes are the default. */
	itemType: "link" | "calendly";
	/** Only set when the widget allows fewer sizes than its item type. */
	presets?: readonly PresetName[];
	/** Card border follows the neutral widget border, not the link theme. */
	neutralBorder: boolean;
	/** The item toolbar lets the owner edit the URL. */
	editableUrl: boolean;
};

export const widgetRules: Record<WidgetKind, WidgetRule> = {
	rss: { itemType: "link", neutralBorder: true, editableUrl: true },
	tweet: {
		itemType: "link",
		presets: ["portrait", "squareLarge"],
		neutralBorder: true,
		editableUrl: false,
	},
	spotify: { itemType: "link", neutralBorder: false, editableUrl: true },
	calendly: { itemType: "calendly", neutralBorder: true, editableUrl: true },
};

export function getWidgetPresets(kind: WidgetKind): readonly PresetName[] {
	const rule = widgetRules[kind];
	return rule.presets ?? getAllowedPresets(rule.itemType);
}

/**
 * RSS and Tweet items keep their provider id even though no URL host backs it,
 * so the id alone marks the widget.
 */
export function isWidgetProvider(provider: string | undefined) {
	return provider === "rss-feed" || provider === "tweet";
}

export function getWidgetKind(item: WidgetKindInput): WidgetKind | null {
	if (item.type === "calendly") return "calendly";
	if (item.type !== "link") return null;
	const metadata = item.data.metadata;
	switch (metadata?.provider) {
		case "rss-feed":
			return "rss";
		case "tweet":
			return "tweet";
		// A Spotify URL is a plain link card until the owner adds it as a widget.
		case "spotify":
			return metadata.widget === "spotify" ? "spotify" : null;
		default:
			return null;
	}
}

export function getItemPresets(item: WidgetKindInput): readonly PresetName[] {
	const kind = getWidgetKind(item);
	return kind ? getWidgetPresets(kind) : getAllowedPresets(item.type);
}

/** Advanced-widget providers shown as "coming soon" without a renderer yet. */
const comingSoonWidgetProviders = new Set<string>(
	providerDefinitions
		.filter((provider) => "advancedWidget" in provider)
		.map((provider) => provider.id)
		.filter((id) => id !== "spotify" && !isWidgetProvider(id)),
);

/** Items a free account cannot add. */
export function requiresProPlan(item: WidgetKindInput) {
	return (
		getWidgetKind(item) !== null ||
		(item.type === "link" &&
			comingSoonWidgetProviders.has(item.data.metadata?.provider ?? ""))
	);
}
