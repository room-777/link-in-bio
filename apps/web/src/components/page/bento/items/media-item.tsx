"use client";

import type { PresetName } from "@grabbin/bento-layout";

import type { BentoCommand, BentoItem } from "@/lib/bento/bento-types";
import { ExternalAction, MediaCaption } from "./shared";
import { useMediaCropEditor } from "./use-media-crop-editor";

export function MediaItem({
	item,
	preset,
	mode,
	onCommand,
}: {
	item: Extract<BentoItem, { type: "media" }>;
	preset: PresetName;
	mode: "view" | "edit";
	onCommand?: (command: BentoCommand) => void;
}) {
	const isVideo = item.data.mimeType.startsWith("video/");
	const {
		frameRef,
		imageRef,
		videoRef,
		currentCrop,
		cropStyle,
		hasSourceSize,
		isCropOpen,
		isDragging,
		handleImageLoad,
		handleVideoLoadedMetadata,
		handleCropPointerDown,
		handleCropPointerMove,
		handleCropPointerEnd,
	} = useMediaCropEditor({ item, mode, onCommand });

	const media = !item.data.mediaUrl ? null : isVideo ? (
		<video
			ref={videoRef}
			autoPlay
			loop
			muted
			playsInline
			preload="metadata"
			src={item.data.mediaUrl}
			onLoadedMetadata={handleVideoLoadedMetadata}
			className={`pointer-events-none absolute inset-0 ${cropStyle ? "size-full" : "size-full object-cover"}`}
		/>
	) : (
		<img
			ref={imageRef}
			alt={item.data.caption ?? "Media item"}
			className={`pointer-events-none absolute inset-0 ${cropStyle ? "size-full" : "size-full object-cover"}`}
			decoding="async"
			fetchPriority="low"
			loading="lazy"
			src={item.data.mediaUrl}
			onLoad={handleImageLoad}
		/>
	);

	return (
		<div
			ref={frameRef}
			data-media-frame="true"
			data-media-preset={preset}
			data-bento-item-crop-open={isCropOpen ? "true" : undefined}
			className={`relative size-full overflow-hidden rounded-[inherit] bg-muted/30 ${!isCropOpen && hasSourceSize && item.data.mediaUrl && !item.data.mediaUrl.startsWith("data:") ? "surface-line" : ""} ${isCropOpen ? "overflow-visible!" : ""}`}
		>
			{cropStyle ? (
				<div
					className={`absolute overflow-hidden rounded-[inherit] ${isCropOpen ? "smooth-shadow-lg" : ""}`}
					style={cropStyle}
				>
					{media}
					{isCropOpen && currentCrop ? (
						<div
							aria-hidden="true"
							className="pointer-events-none absolute inset-0 z-10 overflow-hidden rounded-[inherit]"
						>
							<span
								className="pointer-events-none absolute rounded-[inherit]"
								style={{
									left: `${currentCrop.x}%`,
									top: `${currentCrop.y}%`,
									width: `${currentCrop.width}%`,
									height: `${currentCrop.height}%`,
									boxShadow: "0 0 0 9999px rgb(255 255 255 / 0.35)",
								}}
							/>
						</div>
					) : null}
				</div>
			) : (
				media
			)}
			{isCropOpen && cropStyle ? (
				<>
					<button
						type="button"
						aria-label="Drag media to crop"
						data-bento-item-drag-cancel="true"
						className={`absolute z-20 cursor-grab! touch-none rounded-[inherit] border-0 bg-transparent p-0 focus-visible:ring-2 focus-visible:ring-ring/60 ${isDragging ? "cursor-grabbing!" : ""}`}
						style={cropStyle}
						onPointerDown={handleCropPointerDown}
						onPointerMove={handleCropPointerMove}
						onPointerUp={handleCropPointerEnd}
						onPointerCancel={handleCropPointerEnd}
					/>
					<span
						aria-hidden="true"
						className="pointer-events-none absolute inset-0 z-30 rounded-[inherit] border-[3px] border-black"
					/>
				</>
			) : null}
			<div className="pointer-events-none absolute inset-x-0 bottom-0 flex min-w-0 items-center justify-between gap-3 p-4 text-white">
				<MediaCaption
					value={item.data.caption}
					mode={mode}
					className="max-w-[calc(100%-4.5rem)]"
					onChange={(caption) =>
						onCommand?.({
							type: "update-data",
							itemId: item.id,
							data: { ...item.data, caption: caption.trim() || undefined },
						})
					}
				/>
			</div>
			{item.data.link ? (
				<div className="pointer-events-none absolute right-3 bottom-4 z-20">
					<div className="pointer-events-auto flex h-fit items-center">
						<ExternalAction href={item.data.link} label="Open media" />
					</div>
				</div>
			) : null}
		</div>
	);
}
