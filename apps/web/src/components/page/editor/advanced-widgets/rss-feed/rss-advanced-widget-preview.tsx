import type { RssFeedResponse } from "@grabbin/api";
import { getPresetGeometry } from "@grabbin/bento-layout";
import type { BentoItem } from "@/lib/bento/bento-types";
import { AdvancedWidgetPresetControls } from "../../advanced-widget-preset-controls";
import { AdvancedWidgetPreviewFrame } from "../advanced-widget-preview-frame";
import {
	advancedWidgetPresets,
	useAdvancedWidgetPreset,
} from "../use-advanced-widget-preset";
import { RssFeedWidget } from "./rss-feed-widget";

const previewItem: BentoItem = {
	id: "advanced-widget-preview-rss-feed",
	type: "link",
	data: {
		url: "https://example.com",
		metadata: { title: "RSS Feed", provider: "rss-feed" },
	},
	style: {},
	layouts: {
		wide: getPresetGeometry("squareLarge", "wide"),
		compact: getPresetGeometry("squareLarge", "compact"),
	},
	createdAt: "2026-10-09T00:00:00.000Z",
	updatedAt: "2026-10-09T00:00:00.000Z",
	preset: "squareLarge",
};

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
	} = useAdvancedWidgetPreset(advancedWidgetPresets["rss-feed"], "squareLarge");
	const item: BentoItem = {
		...previewItem,
		preset: visiblePreset,
		layouts: {
			wide: getPresetGeometry(visiblePreset, "wide"),
			compact: getPresetGeometry(visiblePreset, "compact"),
		},
	};
	return (
		<AdvancedWidgetPreviewFrame
			item={item}
			transitionPhase={transitionPhase}
			onTransitionComplete={onTransitionComplete}
			controls={
				<AdvancedWidgetPresetControls
					presets={advancedWidgetPresets["rss-feed"]}
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

export { RssAdvancedWidgetPreview };
