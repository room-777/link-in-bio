"use client";

import type { PageItemResponse } from "@grabbin/api";
import { Tweet } from "./card";
import { getTweetId } from "./tweet-url";

export function TweetWidget({
	url,
	className,
}: {
	url: string;
	className?: string;
}) {
	const id = getTweetId(url);
	if (!id) {
		return (
			<div className="flex size-full items-center justify-center text-muted-foreground text-sm">
				Tweet unavailable
			</div>
		);
	}

	return <Tweet id={id} className={className} showCopyLink={false} />;
}

export function TweetItem({
	item,
	mode,
}: {
	item: Extract<PageItemResponse, { type: "link" }>;
	mode: "view" | "edit";
}) {
	return (
		<div
			className={
				mode === "edit" ? "pointer-events-none size-full" : "size-full"
			}
		>
			<TweetWidget
				url={item.data.url}
				className="size-full min-h-0 max-w-none p-3"
			/>
		</div>
	);
}
