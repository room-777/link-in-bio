"use client";

import type { PageItemResponse } from "@grabbin/api";
import type { PresetName } from "@grabbin/bento-layout";
import { Tweet } from "./card";
import { getTweetId } from "./tweet-url";

export function TweetWidget({
	url,
	className,
	preset,
}: {
	url: string;
	className?: string;
	preset?: PresetName;
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
		/>
	);
}

export function TweetItem({
	item,
	mode,
	preset,
}: {
	item: Extract<PageItemResponse, { type: "link" }>;
	mode: "view" | "edit";
	preset: PresetName;
}) {
	return (
		<div
			className={
				mode === "edit" ? "pointer-events-none size-full" : "size-full"
			}
		>
			<TweetWidget
				url={item.data.url}
				preset={preset}
				className="size-full min-h-0 max-w-none"
			/>
		</div>
	);
}
