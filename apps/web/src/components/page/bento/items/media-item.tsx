"use client";

import type { PresetName } from "@grabbin/bento-layout";
import { useState } from "react";

import type { BentoItem } from "@/lib/bento/bento-types";
import { ExternalAction, MediaCaption } from "./shared";

export function MediaItem({
	item,
	preset,
}: {
	item: Extract<BentoItem, { type: "media" }>;
	preset: PresetName;
}) {
	const isVideo = item.data.mimeType.startsWith("video/");
	const [mediaReady, setMediaReady] = useState(false);
	return (
		<div
			data-media-frame="true"
			data-media-preset={preset}
			className={`relative size-full overflow-hidden rounded-[inherit] bg-muted/30 ${mediaReady && !item.data.mediaUrl?.startsWith("data:") ? "surface-line" : ""}`}
		>
			{item.data.mediaUrl ? (
				isVideo ? (
					<video
						autoPlay
						loop
						muted
						playsInline
						preload="metadata"
						src={item.data.mediaUrl}
						onLoadedMetadata={() => setMediaReady(true)}
						className="pointer-events-none absolute inset-0 size-full object-cover"
					/>
				) : (
					<img
						alt={item.data.caption ?? "Media item"}
						className="pointer-events-none absolute inset-0 size-full object-cover"
						decoding="async"
						fetchPriority="low"
						loading="lazy"
						src={item.data.mediaUrl}
						onLoad={() => setMediaReady(true)}
					/>
				)
			) : null}
			<div className="pointer-events-none absolute inset-x-0 bottom-0 flex min-w-0 items-center justify-between gap-3 p-4 text-white">
				<MediaCaption value={item.data.caption} />
				{item.data.link ? (
					<div className="pointer-events-auto flex h-fit shrink-0 items-center">
						<ExternalAction href={item.data.link} label="Open media" />
					</div>
				) : null}
			</div>
		</div>
	);
}
