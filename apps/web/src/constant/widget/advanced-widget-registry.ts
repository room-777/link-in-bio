import { providerDefinitions, providerIconUrl } from "@grabbin/page-link";

export type AdvancedWidgetModule = {
	id: AdvancedWidgetId;
	label: string;
	iconUrl: string;
	iconFrame: boolean;
	brandColor?: string;
	badges: readonly { id: string; label: string; iconUrl: string }[];
};

type ConfiguredProvider = (typeof providerDefinitions)[number];
type AdvancedWidgetProvider = Extract<
	ConfiguredProvider,
	{ advancedWidget: object }
>;
type AdvancedWidgetId = AdvancedWidgetProvider["id"];

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
			};
		});
