"use client";

import { getAllowedPresets, type PresetName } from "@grabbin/bento-layout";
import { Button } from "@grabbin/ui/components/button";
import type { BentoItem } from "@/features/page/bento-item";
import BentoPresetIcon from "@/features/page/editor/components/bento/bento-preset-icon";
import { presetLabels } from "@/features/page/editor/components/bento/preset-labels";
import type { BentoCommand } from "@/features/page/editor/types";

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
