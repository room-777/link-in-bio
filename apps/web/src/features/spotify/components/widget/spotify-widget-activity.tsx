"use client";

import type { PageItemLinkMetadata } from "@grabbin/api";
import { resolveLinkProvider } from "@grabbin/page-link";
import { useEffect, useState } from "react";
import { useAdvancedWidgetActions } from "@/features/page/editor/contexts/advanced-widget-actions-context";
import type { AdvancedWidgetActivityProps } from "@/features/page/editor/types";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { normalizeHttpsUrl } from "@/lib/normalize-https-url";
import SpotifyAdvancedWidgetPreview from "./spotify-advanced-widget-preview";
import SpotifyWidgetDetails from "./spotify-widget-details";

export default function SpotifyWidgetActivity({
	onClose,
}: AdvancedWidgetActivityProps) {
	const actions = useAdvancedWidgetActions();
	const [inputValue, setInputValue] = useState("");
	const debouncedInput = useDebouncedValue(inputValue);
	const [spotifyPreview, setSpotifyPreview] = useState<{
		url: string;
		metadata: PageItemLinkMetadata;
	}>();
	const [spotifyPreviewError, setSpotifyPreviewError] = useState(false);
	const spotifyPreviewUrl = normalizeHttpsUrl(debouncedInput);
	const spotifyProvider = spotifyPreviewUrl
		? resolveLinkProvider(new URL(spotifyPreviewUrl))
		: undefined;
	const isSpotifyPreviewUrl = Boolean(
		spotifyProvider?.id === "spotify" && spotifyProvider.target,
	);

	useEffect(() => {
		if (!spotifyPreviewUrl || !isSpotifyPreviewUrl) {
			setSpotifyPreview(undefined);
			setSpotifyPreviewError(false);
			return;
		}

		let isCurrent = true;
		setSpotifyPreview(undefined);
		setSpotifyPreviewError(false);
		void actions
			.onSpotifyPreview(spotifyPreviewUrl)
			.then((metadata) => {
				if (isCurrent) setSpotifyPreview({ url: spotifyPreviewUrl, metadata });
			})
			.catch(() => {
				if (isCurrent) setSpotifyPreviewError(true);
			});
		return () => {
			isCurrent = false;
		};
	}, [actions, isSpotifyPreviewUrl, spotifyPreviewUrl]);

	function handleInputChange(value: string) {
		setInputValue(value);
		setSpotifyPreviewError(false);
	}

	async function handleSpotifyAdd(url: string, metadata: PageItemLinkMetadata) {
		const added = await actions.onSpotifyAdd(url, metadata);
		if (added) onClose();
		return added;
	}

	return (
		<div className="flex h-full min-h-0 flex-col gap-6">
			<SpotifyAdvancedWidgetPreview
				inputValue={inputValue}
				spotifyPreview={spotifyPreview}
			/>
			<div className="min-h-0 flex-1">
				<SpotifyWidgetDetails
					onSpotifyAdd={handleSpotifyAdd}
					onInputChange={handleInputChange}
					spotifyPreview={spotifyPreview}
					spotifyPreviewError={spotifyPreviewError}
				/>
			</div>
		</div>
	);
}
