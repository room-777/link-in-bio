import { getPresetGeometry } from "@grabbin/bento-layout";
import type { BentoItem } from "@/lib/bento/bento-types";
import { AdvancedWidgetPresetControls } from "../../advanced-widget-preset-controls";
import { AdvancedWidgetPreviewFrame } from "../advanced-widget-preview-frame";
import {
	advancedWidgetPresets,
	useAdvancedWidgetPreset,
} from "../use-advanced-widget-preset";
import { TweetSkeleton } from "./tweet-skeleton";
import { getTweetId } from "./tweet-url";
import { TweetWidget } from "./tweet-widget";

const previewItem: Extract<BentoItem, { type: "link" }> = {
	id: "advanced-widget-preview-tweet",
	type: "link",
	data: {
		url: "https://x.com/i/status/1668408059125702661",
		metadata: {
			title: "X post",
			faviconUrl: "/twitter.svg",
			provider: "tweet",
		},
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

export default function TweetAdvancedWidgetPreview({
	inputValue,
}: {
	inputValue?: string;
}) {
	const debouncedTweetId = getTweetId(inputValue ?? "");
	const {
		preset,
		visiblePreset,
		transitionPhase,
		onPresetChange,
		onTransitionComplete,
	} = useAdvancedWidgetPreset(advancedWidgetPresets.tweet, "squareLarge");

	const previewUrl = debouncedTweetId
		? `https://x.com/i/status/${debouncedTweetId}`
		: previewItem.data.url;
	const item: BentoItem = {
		...previewItem,
		data: { ...previewItem.data, url: previewUrl },
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
					presets={advancedWidgetPresets.tweet}
					preset={preset}
					onPresetChange={onPresetChange}
				/>
			}
		>
			{debouncedTweetId ? (
				<TweetWidget
					url={previewUrl}
					preset={visiblePreset}
					className="size-full min-h-0 max-w-none"
				/>
			) : (
				<TweetSkeleton className="size-full max-w-none" />
			)}
		</AdvancedWidgetPreviewFrame>
	);
}

export { TweetAdvancedWidgetPreview };
