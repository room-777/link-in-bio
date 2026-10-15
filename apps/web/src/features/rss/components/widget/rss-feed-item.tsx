import type { PageItemResponse } from "@grabbin/api";
import type { PresetName } from "@grabbin/bento-layout";
import type { BentoCommand } from "@/features/page/editor/types";
import { RssFeedWidget } from "./rss-feed-widget";

type RssItem = Extract<PageItemResponse, { type: "rss" }>;

export default function RssFeedItem({
	item,
	preset,
	mode,
	onCommand,
}: {
	item: RssItem;
	preset: PresetName;
	mode: "view" | "edit";
	onCommand?: (command: BentoCommand) => void;
}) {
	const { feed } = item.data;
	const title = item.data.title?.trim() || feed?.source.title || "RSS Feed";
	const commitTitle = (nextTitle: string) => {
		if (nextTitle !== item.data.title) {
			onCommand?.({
				type: "update-data",
				itemId: item.id,
				data: { ...item.data, title: nextTitle },
			});
		}
	};

	return (
		<RssFeedWidget
			url={item.data.url}
			feed={feed}
			title={title}
			preset={preset}
			mode={mode}
			onTitleCommit={commitTitle}
		/>
	);
}

export { RssFeedItem };
