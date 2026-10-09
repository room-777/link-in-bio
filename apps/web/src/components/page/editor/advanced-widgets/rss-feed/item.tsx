import type { PageItemResponse } from "@grabbin/api";
import type { PresetName } from "@grabbin/bento-layout";
import type { BentoCommand } from "@/lib/bento/bento-types";
import { RssFeedWidget } from "./widget";

type LinkItem = Extract<PageItemResponse, { type: "link" }>;

export function RssFeedItem({
	item,
	preset,
	mode,
	onCommand,
}: {
	item: LinkItem;
	preset: PresetName;
	mode: "view" | "edit";
	onCommand?: (command: BentoCommand) => void;
}) {
	const feed = item.data.metadata?.rss;
	const title =
		(item.data.metadata?.title !== "RSS Feed" &&
			item.data.metadata?.title?.trim()) ||
		feed?.source.title ||
		"RSS Feed";
	const commitTitle = (nextTitle: string) => {
		if (nextTitle !== item.data.metadata?.title) {
			onCommand?.({
				type: "update-data",
				itemId: item.id,
				data: {
					...item.data,
					metadata: { ...item.data.metadata, title: nextTitle },
				},
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
