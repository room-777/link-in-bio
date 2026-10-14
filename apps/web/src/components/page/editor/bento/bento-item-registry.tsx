"use client";

import type { PresetName } from "@grabbin/bento-layout";
import dynamic from "next/dynamic";
import type { ReactNode } from "react";
import { CalendlyItem } from "@/features/calendly/components/widget/calendly-item";
import type {
	BentoCommand,
	BentoItem,
} from "@/features/page/editor/state/bento-types";
import { RssFeedItem } from "@/features/rss/components/widget/rss-feed-item";
import { SpotifyItem } from "@/features/spotify/components/widget/spotify-item";
import { TweetItem } from "@/features/tweet/components/widget/tweet-item";
import { MediaItem } from "./items/media-item";
import { SectionItem } from "./items/section-item";
import { TextItem } from "./items/text-item";
import { LinkItem } from "./link-item";

const LazyMapItem = dynamic(
	() => import("./items/map-item").then(({ MapItem }) => MapItem),
	{ ssr: false },
);

type ItemRendererOptions = {
	handle?: string;
	mode: "view" | "edit";
	autoFocus: boolean;
	isAnyItemDragging: boolean;
	onAutoFocus?: () => void;
	onCommand?: (command: BentoCommand) => void;
	onLinkImageSelect?: (itemId: string, file: File) => void | Promise<void>;
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

function renderMap({ item, preset, options }: Parameters<ItemRenderer>[0]) {
	if (item.type !== "map") return null;
	return (
		<LazyMapItem
			item={item}
			preset={preset}
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
			isAnyItemDragging={options.isAnyItemDragging}
			onImageSelect={
				options.onLinkImageSelect
					? (file) => options.onLinkImageSelect?.(item.id, file)
					: undefined
			}
		/>
	);
}

function renderCalendly({
	item,
	preset,
	options,
}: Parameters<ItemRenderer>[0]) {
	if (item.type !== "calendly") return null;
	return <CalendlyItem item={item} preset={preset} handle={options.handle} />;
}

function renderRss({ item, preset, options }: Parameters<ItemRenderer>[0]) {
	if (item.type !== "rss") return null;
	return (
		<RssFeedItem
			item={item}
			preset={preset}
			mode={options.mode}
			onCommand={options.onCommand}
		/>
	);
}

function renderTweet({ item, preset, options }: Parameters<ItemRenderer>[0]) {
	if (item.type !== "tweet") return null;
	return <TweetItem item={item} mode={options.mode} preset={preset} />;
}

function renderSpotify({ item, preset }: Parameters<ItemRenderer>[0]) {
	if (item.type !== "spotify") return null;
	return <SpotifyItem item={item} preset={preset} />;
}

const itemRendererRegistry: Record<BentoItem["type"], ItemRenderer> = {
	text: renderText,
	section: renderSection,
	link: renderLink,
	media: renderMedia,
	map: renderMap,
	calendly: renderCalendly,
	rss: renderRss,
	tweet: renderTweet,
	spotify: renderSpotify,
};

export function renderItem(
	item: BentoItem,
	preset: PresetName,
	options: ItemRendererOptions,
) {
	return itemRendererRegistry[item.type]({ item, preset, options });
}
