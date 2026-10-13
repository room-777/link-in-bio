"use client";

import type { PageItemResponse } from "@grabbin/api";
import type { PresetName } from "@grabbin/bento-layout";
import type { Tweet as TweetResponse } from "react-tweet/api";
import { getTweetId } from "../../utils/tweet-url";
import { TweetWidget } from "./tweet-widget";

export default function TweetItem({
	item,
	mode,
	preset,
}: {
	item: Extract<PageItemResponse, { type: "link" }>;
	mode: "view" | "edit";
	preset: PresetName;
}) {
	const authorData =
		item.data.metadata?.provider === "tweet"
			? item.data.metadata.providerData?.tweet
			: undefined;
	const response = authorData?.response;
	const storedTweet =
		typeof response === "object" &&
		response !== null &&
		"id_str" in response &&
		response.id_str === getTweetId(item.data.url)
			? (response as TweetResponse)
			: undefined;
	const authorHandle = authorData?.authorProfileUrl?.match(
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
					name: authorData?.authorName ?? undefined,
					handle: authorHandle,
					imageUrl: authorData?.authorProfileImageUrl ?? undefined,
				}}
				storedTweet={storedTweet}
				fetchOnMissing={false}
				className="size-full min-h-0 max-w-none"
			/>
		</div>
	);
}

export { TweetItem };
