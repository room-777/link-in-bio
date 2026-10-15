"use client";

import type { RssFeedResponse } from "@grabbin/api";
import type { ComponentProps } from "react";

import { useState } from "react";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useRssFeedPreview } from "../../hooks/use-rss-feed-preview";
import RssAdvancedWidgetPreview from "./rss-advanced-widget-preview";
import RssFeedWidgetDetails from "./rss-feed-widget-details";

export default function RssWidgetActivity({
	onClose,
	onAdd,
	onPreview,
	badges,
}: {
	onClose: () => void;
	onAdd: (url: string) => Promise<boolean>;
	onPreview: (url: string) => Promise<RssFeedResponse>;
	badges: ComponentProps<typeof RssFeedWidgetDetails>["badges"];
}) {
	const [inputValue, setInputValue] = useState("");
	const debouncedInput = useDebouncedValue(inputValue);
	const rssFeed = useRssFeedPreview(debouncedInput, onPreview);

	async function handleRssFeedAdd(url: string) {
		const added = await onAdd(url);
		if (added) onClose();
		return added;
	}

	return (
		<div className="flex h-full min-h-0 flex-col gap-6">
			<RssAdvancedWidgetPreview inputValue={debouncedInput} rssFeed={rssFeed} />
			<div className="min-h-0 flex-1">
				<RssFeedWidgetDetails
					onRssFeedAdd={handleRssFeedAdd}
					onInputChange={setInputValue}
					badges={badges}
				/>
			</div>
		</div>
	);
}
