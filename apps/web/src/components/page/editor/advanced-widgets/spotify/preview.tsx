"use client";

import type { PresetName } from "@grabbin/bento-layout";
import { getPresetGeometry } from "@grabbin/bento-layout";
import { useState } from "react";
import type { BentoItem } from "@/lib/bento/bento-types";
import { AdvancedWidgetPreviewFrame } from "../preview-frame";
import { SpotifyPresetControls } from "./preset-controls";
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
	const [preset, setPreset] = useState<PresetName>("squareSmall");
	const [visiblePreset, setVisiblePreset] = useState(preset);
	const [transitionPhase, setTransitionPhase] = useState<"exit" | "enter">();
	const handlePresetChange = (nextPreset: PresetName) => {
		if (nextPreset !== preset) {
			setPreset(nextPreset);
			setTransitionPhase("exit");
		}
	};
	const item: BentoItem = {
		...previewItem,
		preset: visiblePreset,
		layouts: {
			wide: getPresetGeometry(visiblePreset, "wide"),
			compact: getPresetGeometry(visiblePreset, "compact"),
		},
	};
	const handleTransitionComplete = (phase: "exit" | "enter") => {
		if (phase === "exit") {
			setVisiblePreset(preset);
			setTransitionPhase("enter");
		} else {
			setTransitionPhase(undefined);
		}
	};

	return (
		<AdvancedWidgetPreviewFrame
			item={item}
			transitionPhase={transitionPhase}
			onTransitionComplete={handleTransitionComplete}
			controls={
				<SpotifyPresetControls
					preset={preset}
					onPresetChange={handlePresetChange}
				/>
			}
		>
			<SpotifyWidget />
		</AdvancedWidgetPreviewFrame>
	);
}
