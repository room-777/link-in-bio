"use client";

import type { PageItemResponse } from "@grabbin/api";
import type { PresetName } from "@grabbin/bento-layout";
import type { ReactNode } from "react";

import type { BentoCommand, BentoItem } from "@/lib/bento/bento-types";
import { LinkItem } from "../bento-link";
import { MapItem } from "./items/map-item";
import { MediaItem } from "./items/media-item";
import { SectionItem } from "./items/section-item";
import { TextItem } from "./items/text-item";

type ItemRendererOptions = {
	mode: "view" | "edit";
	autoFocus: boolean;
	onAutoFocus?: () => void;
	onCommand?: (command: BentoCommand) => void;
	isUploading?: boolean;
	onCancelUpload?: () => void;
};

type ItemRenderer = (input: {
	item: BentoItem;
	preset: PresetName;
	options: ItemRendererOptions;
}) => ReactNode;

function renderText({ item, preset, options }: Parameters<ItemRenderer>[0]) {
	if (item.type !== "text") return null;
	return <TextItem item={item} preset={preset} {...options} />;
}

function renderMedia({ item, preset, options }: Parameters<ItemRenderer>[0]) {
	if (item.type !== "media") return null;
	return (
		<MediaItem
			item={item}
			preset={preset}
			mode={options.mode}
			onCommand={options.onCommand}
			isUploading={options.isUploading}
			onCancelUpload={options.onCancelUpload}
		/>
	);
}

function renderMap({ item, options }: Parameters<ItemRenderer>[0]) {
	if (item.type !== "map") return null;
	return (
		<MapItem item={item} mode={options.mode} onCommand={options.onCommand} />
	);
}

function renderSection({ item, options }: Parameters<ItemRenderer>[0]) {
	if (item.type !== "section") return null;
	return <SectionItem item={item} {...options} />;
}

function renderLink({ item, preset }: Parameters<ItemRenderer>[0]) {
	if (item.type !== "link") return null;
	return <LinkItem item={item} preset={preset} />;
}

const itemRendererRegistry: Record<BentoItem["type"], ItemRenderer> = {
	text: renderText,
	section: renderSection,
	link: renderLink,
	media: renderMedia,
	map: renderMap,
};

export function RuntimeFallback({ item }: { item: PageItemResponse }) {
	return (
		<div className="flex size-full items-center justify-center px-4 text-center text-muted-foreground text-sm">
			Unsupported {item.type} item
		</div>
	);
}

export function renderItem(
	item: BentoItem,
	preset: PresetName,
	options: ItemRendererOptions,
) {
	return itemRendererRegistry[item.type]({ item, preset, options });
}
