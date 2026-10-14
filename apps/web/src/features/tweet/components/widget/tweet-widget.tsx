"use client";

import type { PresetName } from "@grabbin/bento-layout";
import { getTweetId } from "@grabbin/page-link";
import type { Tweet as TweetResponse } from "react-tweet/api";
import { Tweet } from "./tweet";

export default function TweetWidget({
	url,
	className,
	preset,
	author,
	storedTweet,
	fetchOnMissing,
}: {
	url: string;
	className?: string;
	preset?: PresetName;
	author?: { name?: string; handle?: string; imageUrl?: string };
	storedTweet?: TweetResponse;
	fetchOnMissing?: boolean;
}) {
	const id = getTweetId(url);
	if (!id) {
		return (
			<div className="flex size-full items-center justify-center text-muted-foreground text-sm">
				Tweet unavailable
			</div>
		);
	}

	return (
		<Tweet
			id={id}
			className={className}
			isPortrait={preset === "portrait"}
			showCopyLink={false}
			author={author}
			storedTweet={storedTweet}
			fetchOnMissing={fetchOnMissing}
		/>
	);
}

export { TweetWidget };
