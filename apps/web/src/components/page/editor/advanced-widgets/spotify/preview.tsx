"use client";

import { getPresetGeometry } from "@grabbin/bento-layout";
import type { BentoItem } from "@/lib/bento/bento-types";
import { AdvancedWidgetPresetControls } from "../preset-controls";
import { AdvancedWidgetPreviewFrame } from "../preview-frame";
import {
	advancedWidgetPresets,
	useAdvancedWidgetPreset,
} from "../use-advanced-widget-preset";
import { SpotifyWidget } from "./widget";

const previewItem: BentoItem = {
	id: "advanced-widget-preview-spotify",
	type: "link",
	data: {
		url: "https://open.spotify.com/track/5nTtCOCds6I0PHMNtqelas",
		metadata: { provider: "spotify" },
	},
	style: {},
	layouts: {
		wide: getPresetGeometry("squareSmall", "wide"),
		compact: getPresetGeometry("squareSmall", "compact"),
	},
	createdAt: "2026-10-11T00:00:00.000Z",
	updatedAt: "2026-10-11T00:00:00.000Z",
	preset: "squareSmall",
};

export function SpotifyAdvancedWidgetPreview() {
	const {
		preset,
		visiblePreset,
		transitionPhase,
		onPresetChange,
		onTransitionComplete,
	} = useAdvancedWidgetPreset(advancedWidgetPresets.spotify, "squareSmall");
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
					presets={advancedWidgetPresets.spotify}
					preset={preset}
					onPresetChange={onPresetChange}
				/>
			}
		>
			<SpotifyWidget />
		</AdvancedWidgetPreviewFrame>
	);
}
