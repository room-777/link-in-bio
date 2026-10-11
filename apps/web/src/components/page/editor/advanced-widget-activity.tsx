import type { CalendlyEventType, RssFeedResponse } from "@grabbin/api";
import { useEffect, useState } from "react";
import { advancedWidgetModules } from "@/constant/widget/advanced-widget-registry";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { normalizeHttpsUrl } from "@/lib/normalize-https-url";

export default function AdvancedWidgetActivity({
	widgetId,
	onCalendlyAdd,
	onRssFeedAdd,
	onSpotifyAdd,
	onTweetAdd,
	onRssFeedPreview,
}: {
	widgetId: string;
	onCalendlyAdd: (event: CalendlyEventType) => Promise<void>;
	onRssFeedAdd: (url: string) => Promise<boolean>;
	onSpotifyAdd: (url: string) => Promise<boolean>;
	onTweetAdd: (url: string) => Promise<boolean>;
	onRssFeedPreview: (url: string) => Promise<RssFeedResponse>;
}) {
	const [inputValue, setInputValue] = useState("");
	const debouncedInput = useDebouncedValue(inputValue);
	const [rssFeed, setRssFeed] = useState<RssFeedResponse>();
	useEffect(() => {
		if (widgetId !== "rss-feed" || !debouncedInput.trim()) {
			setRssFeed(undefined);
			return;
		}

		let isCurrent = true;
		setRssFeed(undefined);
		const previewUrl = normalizeHttpsUrl(debouncedInput);
		if (!previewUrl) return;

		void onRssFeedPreview(previewUrl)
			.then((feed) => {
				if (isCurrent) setRssFeed(feed);
			})
			.catch(() => {});
		return () => {
			isCurrent = false;
		};
	}, [debouncedInput, onRssFeedPreview, widgetId]);
	const widget = advancedWidgetModules.find(({ id }) => id === widgetId);
	if (!widget) return null;

	const Details = widget.details;
	const Preview = widget.preview;

	return (
		<div className="flex h-full min-h-0 flex-col gap-6">
			<Preview
				inputValue={debouncedInput}
				rssFeed={widgetId === "rss-feed" ? rssFeed : undefined}
			/>
			<div className="min-h-0 flex-1">
				<Details
					onAdd={onCalendlyAdd}
					onRssFeedAdd={onRssFeedAdd}
					onSpotifyAdd={onSpotifyAdd}
					onTweetAdd={onTweetAdd}
					onInputChange={setInputValue}
					badges={widget.badges}
				/>
			</div>
		</div>
	);
}
