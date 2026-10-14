"use client";

import type { PageItemLinkMetadata } from "@grabbin/api";
import { getPresetGeometry, type PresetName } from "@grabbin/bento-layout";
import { getWidgetPresets } from "@grabbin/page-link";
import { Skeleton } from "@grabbin/ui/components/skeleton";
import { AdvancedWidgetPresetControls } from "@/components/page/editor/advanced-widget-preset-controls";
import { AdvancedWidgetPreviewFrame } from "@/components/page/editor/advanced-widgets/advanced-widget-preview-frame";
import { useAdvancedWidgetPreset } from "@/components/page/editor/advanced-widgets/use-advanced-widget-preset";
import type { BentoItem } from "@/features/page/editor/state/bento-types";
import { normalizeHttpsUrl } from "@/lib/normalize-https-url";
import { SpotifyWidget } from "./spotify-widget";

function SpotifyWidgetSkeleton({ preset }: { preset: PresetName }) {
	const spotifyPreset = preset === "fullBanner" ? "squareSmall" : preset;
	if (spotifyPreset === "squareSmall") {
		return (
			<div
				role="status"
				aria-label="Loading Spotify preview"
				className="relative size-full overflow-hidden rounded-[inherit]"
			>
				<Skeleton className="size-full rounded-[inherit]" />
				<Skeleton className="absolute bottom-4 left-3 h-4 w-1/2" />
				<Skeleton className="absolute top-3 right-3 size-10 rounded-full" />
			</div>
		);
	}

	if (spotifyPreset === "halfBanner") {
		return (
			<div
				role="status"
				aria-label="Loading Spotify preview"
				className="flex size-full items-center gap-3 rounded-[inherit] p-5"
			>
				<Skeleton className="size-10 shrink-0 rounded-md" />
				<div className="flex min-w-0 flex-1 flex-col gap-2">
					<Skeleton className="h-4 w-3/4" />
					<Skeleton className="h-3 w-1/2" />
				</div>
				<Skeleton className="size-8 shrink-0 rounded-full" />
			</div>
		);
	}

	return (
		<div
			role="status"
			aria-label="Loading Spotify preview"
			className={`flex size-full min-h-0 gap-3 rounded-[inherit] p-3 ${spotifyPreset === "landscape" ? "flex-row" : "flex-col"}`}
		>
			<Skeleton
				className={`shrink-0 rounded-xl ${spotifyPreset === "landscape" ? "aspect-square h-full" : "h-1/2 w-full"}`}
			/>
			<div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 py-1">
				<Skeleton className="h-4 w-3/4 shrink-0" />
				<Skeleton className="h-4 w-full shrink-0" />
				<Skeleton className="h-4 w-5/6 shrink-0" />
			</div>
		</div>
	);
}

export default function SpotifyAdvancedWidgetPreview({
	inputValue,
	spotifyPreview,
}: {
	inputValue?: string;
	spotifyPreview?: { url: string; metadata: PageItemLinkMetadata };
}) {
	const {
		preset,
		visiblePreset,
		transitionPhase,
		onPresetChange,
		onTransitionComplete,
	} = useAdvancedWidgetPreset(getWidgetPresets("spotify"), "squareSmall");
	const url =
		normalizeHttpsUrl(inputValue ?? "") ?? "https://open.spotify.com/";
	const metadata =
		spotifyPreview?.url === url ? spotifyPreview.metadata : undefined;
	const item: Extract<BentoItem, { type: "link" }> = {
		id: "advanced-widget-preview-spotify",
		type: "link",
		data: { url, ...(metadata ? { metadata } : {}) },
		style: {},
		layouts: {
			wide: getPresetGeometry(visiblePreset, "wide"),
			compact: getPresetGeometry(visiblePreset, "compact"),
		},
		createdAt: "2026-10-11T00:00:00.000Z",
		updatedAt: "2026-10-11T00:00:00.000Z",
		preset: visiblePreset,
	};
	return (
		<AdvancedWidgetPreviewFrame
			item={item}
			transitionPhase={transitionPhase}
			onTransitionComplete={onTransitionComplete}
			interactive={Boolean(metadata)}
			controls={
				<AdvancedWidgetPresetControls
					presets={getWidgetPresets("spotify")}
					preset={preset}
					onPresetChange={onPresetChange}
				/>
			}
		>
			{metadata ? (
				<SpotifyWidget item={item} preset={visiblePreset} />
			) : (
				<SpotifyWidgetSkeleton preset={visiblePreset} />
			)}
		</AdvancedWidgetPreviewFrame>
	);
}
