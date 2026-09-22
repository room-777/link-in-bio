"use client";

import type { PageItemResponse } from "@grabbin/api";
import type { PresetName } from "@grabbin/bento-layout";
import dynamic from "next/dynamic";
import type { ReactNode } from "react";

import type { BentoCommand, BentoItem } from "@/lib/bento/bento-types";
import { LinkItem } from "../bento-link";
import { MediaItem } from "./items/media-item";
import { SectionItem } from "./items/section-item";
import { TextItem } from "./items/text-item";

const LazyMapItem = dynamic(
	() => import("./items/map-item").then(({ MapItem }) => MapItem),
	{ ssr: false },
);

type ItemRendererOptions = {
	mode: "view" | "edit";
	autoFocus: boolean;
	onAutoFocus?: () => void;
	onCommand?: (command: BentoCommand) => void;
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
		/>
	);
}

function renderMap({ item, options }: Parameters<ItemRenderer>[0]) {
	if (item.type !== "map") return null;
	return (
		<LazyMapItem
			item={item}
			mode={options.mode}
			onCommand={options.onCommand}
		/>
	);
}

function renderSection({ item, options }: Parameters<ItemRenderer>[0]) {
	if (item.type !== "section") return null;
	return <SectionItem item={item} {...options} />;
}

function renderLink({ item, preset, options }: Parameters<ItemRenderer>[0]) {
	if (item.type !== "link") return null;
	return (
		<LinkItem
			item={item}
			preset={preset}
			mode={options.mode}
			onCommand={options.onCommand}
		/>
	);
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
