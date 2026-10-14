import type { PresetName } from "@grabbin/bento-layout";
import { useState } from "react";

export function useAdvancedWidgetPreset(
	allowedPresets: readonly PresetName[],
	initialPreset: PresetName,
) {
	const [preset, setPreset] = useState(initialPreset);
	const [visiblePreset, setVisiblePreset] = useState(initialPreset);
	const [transitionPhase, setTransitionPhase] = useState<"exit" | "enter">();

	const onPresetChange = (nextPreset: PresetName) => {
		if (nextPreset !== preset && allowedPresets.includes(nextPreset)) {
			setPreset(nextPreset);
			setTransitionPhase("exit");
		}
	};
	const onTransitionComplete = (phase: "exit" | "enter") => {
		if (phase === "exit") {
			setVisiblePreset(preset);
			setTransitionPhase("enter");
		} else {
			setTransitionPhase(undefined);
		}
	};

	return {
		preset,
		visiblePreset,
		transitionPhase,
		onPresetChange,
		onTransitionComplete,
	};
}
