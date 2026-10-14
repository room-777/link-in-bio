"use client";

import { useState } from "react";
import { useAdvancedWidgetActions } from "@/features/page/editor/contexts/advanced-widget-actions-context";
import type { AdvancedWidgetActivityProps } from "@/features/page/editor/types";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import TweetAdvancedWidgetPreview from "./tweet-advanced-widget-preview";
import TweetWidgetDetails from "./tweet-widget-details";

export default function TweetWidgetActivity({
	onClose,
}: AdvancedWidgetActivityProps) {
	const actions = useAdvancedWidgetActions();
	const [inputValue, setInputValue] = useState("");
	const debouncedInput = useDebouncedValue(inputValue);

	async function handleTweetAdd(url: string) {
		const added = await actions.onTweetAdd(url);
		if (added) onClose();
		return added;
	}

	return (
		<div className="flex h-full min-h-0 flex-col gap-6">
			<TweetAdvancedWidgetPreview inputValue={debouncedInput} />
			<div className="min-h-0 flex-1">
				<TweetWidgetDetails
					onTweetAdd={handleTweetAdd}
					onInputChange={setInputValue}
				/>
			</div>
		</div>
	);
}
