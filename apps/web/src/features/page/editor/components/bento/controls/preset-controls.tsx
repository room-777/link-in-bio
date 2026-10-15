"use client";

import { getAllowedPresets, type PresetName } from "@grabbin/bento-layout";
import { Button } from "@grabbin/ui/components/button";
import BentoPresetIcon from "@/features/page/editor/components/bento/bento-preset-icon";
import type {
	BentoCommand,
	BentoItem,
} from "@/features/page/editor/state/bento-types";

const presetLabels = {
	fullBanner: "Full banner",
	halfBanner: "Half banner",
	squareSmall: "Small square",
	landscape: "Wide",
	squareLarge: "Full square",
	portrait: "Portrait",
} as const;

export default function PresetControls({
	item,
	breakpoint,
	currentPreset,
	onCommand,
}: {
	item: BentoItem;
	breakpoint: "wide" | "compact";
	currentPreset: PresetName | null;
	onCommand: (command: BentoCommand) => void;
}) {
	return getAllowedPresets(item.type).map((preset) => (
		<Button
			key={preset}
			type="button"
			size="icon"
			variant="ghost"
			aria-label={presetLabels[preset]}
			aria-pressed={currentPreset === preset}
			title={presetLabels[preset]}
			className="size-8 cursor-pointer! rounded-md text-primary-foreground hover:bg-white/20 hover:text-primary-foreground aria-pressed:bg-primary-foreground aria-pressed:text-primary"
			onClick={() =>
				onCommand({
					type: "apply-preset",
					itemId: item.id,
					breakpoint,
					preset,
				})
			}
		>
			<BentoPresetIcon preset={preset} />
		</Button>
	));
}
