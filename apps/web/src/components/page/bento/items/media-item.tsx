"use client";

import type { PresetName } from "@grabbin/bento-layout";
import { Button } from "@grabbin/ui/components/button";
import { LoaderCircle, X } from "lucide-react";
import { useState } from "react";

import type { BentoCommand, BentoItem } from "@/lib/bento/bento-types";
import { ExternalAction, MediaCaption } from "./shared";

export function MediaItem({
	item,
	preset,
	mode,
	onCommand,
	isUploading = false,
	onCancelUpload,
}: {
	item: Extract<BentoItem, { type: "media" }>;
	preset: PresetName;
	mode: "view" | "edit";
	onCommand?: (command: BentoCommand) => void;
	isUploading?: boolean;
	onCancelUpload?: () => void;
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
			{mode === "edit" && isUploading && onCancelUpload ? (
				<div className="pointer-events-auto absolute top-3 right-3 z-10 flex items-center gap-2 rounded-full bg-black/50 px-2 py-1 text-white text-xs backdrop-blur-sm">
					<LoaderCircle className="size-3.5 animate-spin" aria-hidden="true" />
					<span>Uploading...</span>
					<Button
						type="button"
						variant="ghost"
						size="icon-xs"
						aria-label="Cancel media upload"
						title="Cancel media upload"
						data-bento-item-drag-cancel="true"
						onClick={onCancelUpload}
						className="size-5 rounded-full text-white hover:bg-white/20 hover:text-white"
					>
						<X aria-hidden="true" />
					</Button>
				</div>
			) : null}
			<div className="pointer-events-none absolute inset-x-0 bottom-0 flex min-w-0 items-center justify-between gap-3 p-4 text-white">
				<MediaCaption
					value={item.data.caption}
					mode={mode}
					onChange={(caption) =>
						onCommand?.({
							type: "update-data",
							itemId: item.id,
							data: { ...item.data, caption: caption.trim() || undefined },
						})
					}
				/>
				{item.data.link ? (
					<div className="pointer-events-auto flex h-fit shrink-0 items-center">
						<ExternalAction href={item.data.link} label="Open media" />
					</div>
				) : null}
			</div>
		</div>
	);
}
