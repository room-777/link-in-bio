"use client";

import type { PresetName } from "@grabbin/bento-layout";
import dynamic from "next/dynamic";
import type { ReactNode } from "react";
import { CalendlyItem } from "@/features/calendly/components/widget/calendly-item";
import type { BentoItem } from "@/features/page/bento-item";
import type { MapItemInteraction } from "@/features/page/editor/hooks/use-map-item-interaction";
import type { MediaCrop } from "@/features/page/editor/hooks/use-media-crop";
import type { BentoCommand } from "@/features/page/editor/types";
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
	mediaCrop: MediaCrop;
	mapInteraction: MapItemInteraction;
	handle?: string;
	mode: "view" | "edit";
	autoFocus: boolean;
	isAnyItemDragging: boolean;
	onAutoFocus?: () => void;
	onCommand?: (command: BentoCommand) => void;
	onLinkImageSelect?: (itemId: string, file: File) => void | Promise<void>;
};

export function renderItem(
	item: BentoItem,
	preset: PresetName,
	options: ItemRendererOptions,
): ReactNode {
	switch (item.type) {
		case "text":
			return <TextItem item={item} preset={preset} {...options} />;
		case "section":
			return <SectionItem item={item} {...options} />;
		case "media":
			return (
				<MediaItem
					crop={options.mediaCrop}
					item={item}
					preset={preset}
					mode={options.mode}
					onCommand={options.onCommand}
				/>
			);
		case "map":
			return (
				<LazyMapItem
					interaction={options.mapInteraction}
					item={item}
					preset={preset}
					mode={options.mode}
					onCommand={options.onCommand}
				/>
			);
		case "link":
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
		case "calendly":
			return (
				<CalendlyItem item={item} preset={preset} handle={options.handle} />
			);
		case "rss":
			return (
				<RssFeedItem
					item={item}
					preset={preset}
					mode={options.mode}
					onCommand={options.onCommand}
				/>
			);
		case "tweet":
			return <TweetItem item={item} mode={options.mode} preset={preset} />;
		case "spotify":
			return <SpotifyItem item={item} preset={preset} />;
		default: {
			const unhandled: never = item;
			return unhandled;
		}
	}
}
