import { getAllowedPresets, getPresetGeometry } from "@grabbin/bento-layout";
import { getTweetId } from "@grabbin/page-link";
import { AdvancedWidgetPresetControls } from "@/components/page/editor/advanced-widget-preset-controls";
import { AdvancedWidgetPreviewFrame } from "@/components/page/editor/advanced-widgets/advanced-widget-preview-frame";
import { useAdvancedWidgetPreset } from "@/components/page/editor/advanced-widgets/use-advanced-widget-preset";
import type { BentoItem } from "@/features/page/bento-item";
import { TweetSkeleton } from "./tweet-skeleton";
import { TweetWidget } from "./tweet-widget";

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
	} = useAdvancedWidgetPreset(getAllowedPresets("tweet"), "squareLarge");

	const previewUrl = debouncedTweetId
		? `https://x.com/i/status/${debouncedTweetId}`
		: "https://x.com/";
	const item: BentoItem = {
		id: "advanced-widget-preview-tweet",
		type: "tweet",
		data: { url: previewUrl },
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
					presets={getAllowedPresets("tweet")}
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
