import { getPresetGeometry } from "@grabbin/bento-layout";
import { useEffect, useState } from "react";
import type { BentoItem } from "@/lib/bento/bento-types";
import { AdvancedWidgetPreviewFrame } from "../preview-frame";
import { TweetSkeleton } from "./card";
import { getTweetId } from "./tweet-url";
import { TweetWidget } from "./widget";

const previewItem: Extract<BentoItem, { type: "link" }> = {
	id: "advanced-widget-preview-tweet",
	type: "link",
	data: {
		url: "https://x.com/i/status/1668408059125702661",
		metadata: {
			title: "X post",
			faviconUrl: "/twitter.svg",
			provider: "tweet",
		},
	},
	style: {},
	layouts: {
		wide: getPresetGeometry("squareLarge", "wide"),
		compact: getPresetGeometry("squareLarge", "compact"),
	},
	createdAt: "2026-10-09T00:00:00.000Z",
	updatedAt: "2026-10-09T00:00:00.000Z",
	preset: "squareLarge",
};

export function TweetAdvancedWidgetPreview({
	tweetInput,
}: {
	tweetInput?: string;
}) {
	const [tweetId, setTweetId] = useState<string | null>(null);

	useEffect(() => {
		const timeoutId = window.setTimeout(() => {
			setTweetId(getTweetId(tweetInput ?? ""));
		}, 500);

		return () => window.clearTimeout(timeoutId);
	}, [tweetInput]);

	const previewUrl = tweetId
		? `https://x.com/i/status/${tweetId}`
		: previewItem.data.url;
	const item: BentoItem = {
		...previewItem,
		data: { ...previewItem.data, url: previewUrl },
	};

	return (
		<AdvancedWidgetPreviewFrame item={item}>
			{tweetId ? (
				<TweetWidget
					url={previewUrl}
					className="size-full min-h-0 max-w-none"
				/>
			) : (
				<TweetSkeleton className="size-full max-w-none" />
			)}
		</AdvancedWidgetPreviewFrame>
	);
}
