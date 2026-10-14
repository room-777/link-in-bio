"use client";

import type { PageItemResponse } from "@grabbin/api";
import type { PresetName } from "@grabbin/bento-layout";
import { getTweetId } from "@grabbin/page-link";
import type { Tweet as TweetResponse } from "react-tweet/api";
import { TweetWidget } from "./tweet-widget";

export default function TweetItem({
	item,
	mode,
	preset,
}: {
	item: Extract<PageItemResponse, { type: "tweet" }>;
	mode: "view" | "edit";
	preset: PresetName;
}) {
	const response = item.data.tweet;
	const storedTweet =
		typeof response === "object" &&
		response !== null &&
		"id_str" in response &&
		response.id_str === getTweetId(item.data.url)
			? (response as TweetResponse)
			: undefined;
	const authorHandle = item.data.authorProfileUrl?.match(
		/(?:x|twitter)\.com\/([^/?#]+)/i,
	)?.[1];

	return (
		<div
			className={
				mode === "edit" ? "pointer-events-none size-full" : "size-full"
			}
		>
			<TweetWidget
				url={item.data.url}
				preset={preset}
				author={{
					name: item.data.authorName ?? undefined,
					handle: authorHandle,
					imageUrl: item.data.authorProfileImageUrl ?? undefined,
				}}
				storedTweet={storedTweet}
				fetchOnMissing={false}
				className="size-full min-h-0 max-w-none"
			/>
		</div>
	);
}

export { TweetItem };
