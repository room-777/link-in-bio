"use client";

import { useState } from "react";
import { useAdvancedWidgetActions } from "@/features/page/editor/contexts/advanced-widget-actions-context";
import type { AdvancedWidgetActivityProps } from "@/features/page/editor/types";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useRssFeedPreview } from "../../hooks/use-rss-feed-preview";
import RssAdvancedWidgetPreview from "./rss-advanced-widget-preview";
import RssFeedWidgetDetails from "./rss-feed-widget-details";

export default function RssWidgetActivity({
	onClose,
	badges,
}: AdvancedWidgetActivityProps) {
	const actions = useAdvancedWidgetActions();
	const [inputValue, setInputValue] = useState("");
	const debouncedInput = useDebouncedValue(inputValue);
	const rssFeed = useRssFeedPreview(debouncedInput, actions.onRssFeedPreview);

	async function handleRssFeedAdd(url: string) {
		const added = await actions.onRssFeedAdd(url);
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
