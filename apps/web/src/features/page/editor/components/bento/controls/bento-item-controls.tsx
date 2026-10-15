"use client";

import { inferPresetFromLayout } from "@grabbin/bento-layout";
import type {
	BentoCommand,
	BentoItem,
} from "@/features/page/editor/state/bento-types";
import ItemLinkControl from "./item-link-control";
import MapItemExtraControls from "./map-item-extra-controls";
import MediaCropControl from "./media-crop-control";
import PresetControls from "./preset-controls";
import TextStyleControls from "./text-style-controls";

export default function BentoItemControls({
	item,
	breakpoint,
	onCommand,
	onRefreshLinkMetadata,
}: {
	item: BentoItem;
	breakpoint: "wide" | "compact";
	onCommand: (command: BentoCommand) => void;
	onRefreshLinkMetadata?: (itemId: string) => Promise<void>;
}) {
	const currentPreset = inferPresetFromLayout(
		item.type,
		item.layouts[breakpoint],
		breakpoint,
	);

	return (
		<div
			data-bento-item-controls="true"
			data-bento-item-drag-cancel="true"
			className="pointer-events-none absolute top-full left-1/2 z-[100002] mt-2 flex h-10 w-max -translate-x-1/2 -translate-y-1/2 items-center justify-center gap-1 rounded-lg bg-foreground/95 p-1 opacity-0 shadow-lg backdrop-blur-sm transition-opacity duration-150 focus-within:pointer-events-auto focus-within:opacity-100 group-hover/bento-item:pointer-events-auto group-hover/bento-item:opacity-100 group-has-[button[aria-expanded=true]]/bento-item:pointer-events-auto group-has-[button[aria-expanded=true]]/bento-item:opacity-100 motion-reduce:transition-none"
		>
			<PresetControls
				item={item}
				breakpoint={breakpoint}
				currentPreset={currentPreset}
				onCommand={onCommand}
			/>
			{item.type === "media" ? <MediaCropControl item={item} /> : null}
			{item.type === "map" ? <MapItemExtraControls /> : null}
			{item.type === "text" ? (
				<TextStyleControls
					item={item}
					preset={currentPreset}
					onCommand={onCommand}
				/>
			) : null}
			{item.type === "link" || item.type === "media" ? (
				<ItemLinkControl
					item={item}
					onCommand={onCommand}
					onRefreshLinkMetadata={onRefreshLinkMetadata}
				/>
			) : null}
		</div>
	);
}
