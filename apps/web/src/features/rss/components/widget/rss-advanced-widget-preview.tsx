import type { RssFeedResponse } from "@grabbin/api";
import { getAllowedPresets, getPresetGeometry } from "@grabbin/bento-layout";
import { AdvancedWidgetPresetControls } from "@/components/page/editor/advanced-widget-preset-controls";
import { AdvancedWidgetPreviewFrame } from "@/components/page/editor/advanced-widgets/advanced-widget-preview-frame";
import { useAdvancedWidgetPreset } from "@/components/page/editor/advanced-widgets/use-advanced-widget-preset";
import type { BentoItem } from "@/features/page/editor/state/bento-types";
import { RssFeedWidget } from "./rss-feed-widget";

export default function RssAdvancedWidgetPreview({
	inputValue,
	rssFeed,
}: {
	inputValue?: string;
	rssFeed?: RssFeedResponse;
}) {
	const {
		preset,
		visiblePreset,
		transitionPhase,
		onPresetChange,
		onTransitionComplete,
	} = useAdvancedWidgetPreset(getAllowedPresets("rss"), "squareLarge");
	const item: BentoItem = {
		id: "advanced-widget-preview-rss-feed",
		type: "rss",
		data: { url: "https://example.com" },
		style: {},
		preset: visiblePreset,
		layouts: {
			wide: getPresetGeometry(visiblePreset, "wide"),
			compact: getPresetGeometry(visiblePreset, "compact"),
		},
		createdAt: "2026-10-09T00:00:00.000Z",
		updatedAt: "2026-10-09T00:00:00.000Z",
	};
	return (
		<AdvancedWidgetPreviewFrame
			item={item}
			transitionPhase={transitionPhase}
			onTransitionComplete={onTransitionComplete}
			controls={
				<AdvancedWidgetPresetControls
					presets={getAllowedPresets("rss")}
					preset={preset}
					onPresetChange={onPresetChange}
				/>
			}
		>
			<RssFeedWidget
				url={inputValue?.trim() || ""}
				feed={rssFeed}
				title={rssFeed?.source.title || "RSS Feed"}
				isLoading={!rssFeed}
				preset={visiblePreset}
				mode="view"
			/>
		</AdvancedWidgetPreviewFrame>
	);
}
