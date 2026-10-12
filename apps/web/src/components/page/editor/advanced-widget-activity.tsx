import type {
	CalendlyEventType,
	PageItemLinkMetadata,
	RssFeedResponse,
} from "@grabbin/api";
import { resolveLinkProvider } from "@grabbin/page-link";
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
	onSpotifyPreview,
}: {
	widgetId: string;
	onCalendlyAdd: (event: CalendlyEventType) => Promise<void>;
	onRssFeedAdd: (url: string) => Promise<boolean>;
	onSpotifyAdd: (
		url: string,
		metadata: PageItemLinkMetadata,
	) => Promise<boolean>;
	onTweetAdd: (url: string) => Promise<boolean>;
	onRssFeedPreview: (url: string) => Promise<RssFeedResponse>;
	onSpotifyPreview: (url: string) => Promise<PageItemLinkMetadata>;
}) {
	const [inputValue, setInputValue] = useState("");
	const debouncedInput = useDebouncedValue(inputValue);
	const [rssFeed, setRssFeed] = useState<RssFeedResponse>();
	const [spotifyPreview, setSpotifyPreview] = useState<{
		url: string;
		metadata: PageItemLinkMetadata;
	}>();
	const [spotifyPreviewError, setSpotifyPreviewError] = useState(false);
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
	const spotifyPreviewUrl = normalizeHttpsUrl(debouncedInput);
	const spotifyProvider = spotifyPreviewUrl
		? resolveLinkProvider(new URL(spotifyPreviewUrl))
		: undefined;
	const isSpotifyPreviewUrl = Boolean(
		spotifyProvider?.id === "spotify" && spotifyProvider.target,
	);
	const handleInputChange = (value: string) => {
		setInputValue(value);
		setSpotifyPreviewError(false);
	};
	useEffect(() => {
		if (widgetId !== "spotify" || !spotifyPreviewUrl || !isSpotifyPreviewUrl) {
			setSpotifyPreview(undefined);
			setSpotifyPreviewError(false);
			return;
		}

		let isCurrent = true;
		setSpotifyPreview(undefined);
		setSpotifyPreviewError(false);
		void onSpotifyPreview(spotifyPreviewUrl)
			.then((metadata) => {
				if (isCurrent) setSpotifyPreview({ url: spotifyPreviewUrl, metadata });
			})
			.catch(() => {
				if (isCurrent) setSpotifyPreviewError(true);
			});
		return () => {
			isCurrent = false;
		};
	}, [isSpotifyPreviewUrl, onSpotifyPreview, spotifyPreviewUrl, widgetId]);
	const widget = advancedWidgetModules.find(({ id }) => id === widgetId);
	if (!widget) return null;

	const Details = widget.details;
	const Preview = widget.preview;

	return (
		<div className="flex h-full min-h-0 flex-col gap-6">
			<Preview
				inputValue={widgetId === "spotify" ? inputValue : debouncedInput}
				rssFeed={widgetId === "rss-feed" ? rssFeed : undefined}
				spotifyPreview={widgetId === "spotify" ? spotifyPreview : undefined}
			/>
			<div className="min-h-0 flex-1">
				<Details
					onAdd={onCalendlyAdd}
					onRssFeedAdd={onRssFeedAdd}
					onSpotifyAdd={onSpotifyAdd}
					spotifyPreview={widgetId === "spotify" ? spotifyPreview : undefined}
					spotifyPreviewError={
						widgetId === "spotify" ? spotifyPreviewError : undefined
					}
					onTweetAdd={onTweetAdd}
					onInputChange={handleInputChange}
					badges={widget.badges}
				/>
			</div>
		</div>
	);
}
