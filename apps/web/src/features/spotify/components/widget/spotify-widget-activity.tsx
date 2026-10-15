"use client";

import type { WidgetPreview } from "@grabbin/api";
import { resolveLinkProvider } from "@grabbin/page-link";
import { useEffect, useState } from "react";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { normalizeHttpsUrl } from "@/lib/normalize-https-url";
import SpotifyAdvancedWidgetPreview from "./spotify-advanced-widget-preview";
import SpotifyWidgetDetails from "./spotify-widget-details";

export default function SpotifyWidgetActivity({
	onClose,
	onAdd,
	onPreview,
}: {
	onClose: () => void;
	onAdd: (preview: WidgetPreview<"spotify">) => Promise<boolean>;
	onPreview: (url: string) => Promise<WidgetPreview<"spotify">>;
}) {
	const [inputValue, setInputValue] = useState("");
	const debouncedInput = useDebouncedValue(inputValue);
	const [spotifyPreview, setSpotifyPreview] =
		useState<WidgetPreview<"spotify">>();
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
		void onPreview(spotifyPreviewUrl)
			.then((preview) => {
				if (isCurrent) setSpotifyPreview(preview);
			})
			.catch(() => {
				if (isCurrent) setSpotifyPreviewError(true);
			});
		return () => {
			isCurrent = false;
		};
	}, [onPreview, isSpotifyPreviewUrl, spotifyPreviewUrl]);

	function handleInputChange(value: string) {
		setInputValue(value);
		setSpotifyPreviewError(false);
	}

	async function handleSpotifyAdd(preview: WidgetPreview<"spotify">) {
		const added = await onAdd(preview);
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
