import type { PresetName } from "@grabbin/bento-layout";
import { getAllowedPresets } from "@grabbin/bento-layout";
import { Button } from "@grabbin/ui/components/button";
import BentoPresetIcon from "../../bento/bento-preset-icon";

const presetLabels: Record<PresetName, string> = {
	fullBanner: "Full banner",
	halfBanner: "Half banner",
	squareSmall: "Small square",
	landscape: "Wide",
	squareLarge: "Full square",
	portrait: "Portrait",
};

export function SpotifyPresetControls({
	preset,
	onPresetChange,
}: {
	preset: PresetName;
	onPresetChange: (preset: PresetName) => void;
}) {
	return (
		<fieldset className="flex flex-col gap-1 rounded-lg border-0 bg-foreground/95 p-1 shadow-lg backdrop-blur-sm">
			<legend className="sr-only">Preview size</legend>
			{getAllowedPresets("link").map((option) => (
				<Button
					key={option}
					type="button"
					size="icon"
					variant="ghost"
					aria-label={presetLabels[option]}
					aria-pressed={preset === option}
					title={presetLabels[option]}
					className="size-8 cursor-pointer! rounded-md text-primary-foreground hover:bg-white/20 hover:text-primary-foreground aria-pressed:bg-primary-foreground aria-pressed:text-primary"
					onClick={() => onPresetChange(option)}
				>
					<BentoPresetIcon preset={option} />
				</Button>
			))}
		</fieldset>
	);
}
