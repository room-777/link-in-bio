"use client";

import type { PresetName } from "@grabbin/bento-layout";
import Image from "next/image";
import {
	type SyntheticEvent,
	useCallback,
	useEffect,
	useRef,
	useState,
} from "react";

import type { BentoCommand, BentoItem } from "@/lib/bento/bento-types";
import { getPageMediaUrl } from "@/lib/page-media-url";
import { ExternalAction, getScrollTarget, MediaCaption } from "./shared";
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
	const [hasEnteredViewport, setHasEnteredViewport] = useState(false);
	const [isInViewport, setIsInViewport] = useState(false);
	const [imageLoaded, setImageLoaded] = useState(false);
	const [videoLoaded, setVideoLoaded] = useState(false);
	const [imageTransformFailed, setImageTransformFailed] = useState(false);
	const [videoTransformFailed, setVideoTransformFailed] = useState(false);
	const loadedVideoSourceRef = useRef<string | undefined>(undefined);
	const previousMediaUrlRef = useRef(item.data.mediaUrl);
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
	const isLocalPreview = item.data.mediaUrl?.startsWith("blob:") ?? false;
	const originalMediaUrl = isLocalPreview ? undefined : item.data.mediaUrl;
	const transformedMediaUrl = originalMediaUrl
		? getPageMediaUrl(originalMediaUrl, isVideo ? "video" : "image")
		: undefined;
	const imageSrc =
		imageTransformFailed && originalMediaUrl
			? originalMediaUrl
			: transformedMediaUrl;
	const videoSrc =
		videoTransformFailed && originalMediaUrl
			? originalMediaUrl
			: transformedMediaUrl;

	useEffect(() => {
		const frame = frameRef.current;
		if (!frame || typeof IntersectionObserver === "undefined") {
			setHasEnteredViewport(true);
			setIsInViewport(true);
			return;
		}

		const scrollTarget = getScrollTarget(frame);
		const observer = new IntersectionObserver(
			([entry]) => {
				const isIntersecting = Boolean(entry?.isIntersecting);
				setIsInViewport(isIntersecting);
				if (isIntersecting) setHasEnteredViewport(true);
			},
			{ root: scrollTarget instanceof HTMLElement ? scrollTarget : null },
		);
		observer.observe(frame);
		return () => observer.disconnect();
	}, [frameRef]);

	useEffect(() => {
		if (previousMediaUrlRef.current === originalMediaUrl) return;
		previousMediaUrlRef.current = originalMediaUrl;
		setImageLoaded(false);
		setVideoLoaded(false);
		setImageTransformFailed(false);
		setVideoTransformFailed(false);
		loadedVideoSourceRef.current = undefined;
		setHasEnteredViewport(isInViewport);
	}, [isInViewport, originalMediaUrl]);

	useEffect(() => {
		const video = videoRef.current;
		if (!video || !hasEnteredViewport || !videoSrc) return;
		if (loadedVideoSourceRef.current === videoSrc) return;
		loadedVideoSourceRef.current = videoSrc;
		video.load();
	}, [hasEnteredViewport, videoSrc, videoRef]);

	useEffect(() => {
		const video = videoRef.current;
		if (!video) return;
		if (!hasEnteredViewport || !isInViewport) {
			video.pause();
			return;
		}
		void video.play().catch(() => {});
	}, [hasEnteredViewport, isInViewport, videoRef]);

	const handleImageLoadAndMeasure = useCallback(
		(event: SyntheticEvent<HTMLImageElement>) => {
			setImageLoaded(true);
			handleImageLoad(event);
		},
		[handleImageLoad],
	);
	const handleVideoLoadAndMeasure = useCallback(
		(event: SyntheticEvent<HTMLVideoElement>) => {
			handleVideoLoadedMetadata(event);
		},
		[handleVideoLoadedMetadata],
	);

	const isMediaLoaded = isVideo ? videoLoaded : imageLoaded;
	const media = !item.data.mediaUrl ? null : (
		<>
			{item.data.placeholderDataUrl && !isMediaLoaded ? (
				<img
					alt=""
					aria-hidden="true"
					className="pointer-events-none absolute inset-0 size-full scale-110 object-cover blur-md"
					src={item.data.placeholderDataUrl}
				/>
			) : null}
			{isVideo ? (
				<video
					ref={videoRef}
					autoPlay={isInViewport}
					loop
					muted
					playsInline
					preload={hasEnteredViewport ? "metadata" : "none"}
					onLoadedData={() => setVideoLoaded(true)}
					onLoadedMetadata={handleVideoLoadAndMeasure}
					onError={() => {
						if (videoSrc !== originalMediaUrl) {
							setVideoTransformFailed(true);
						}
					}}
					className={`pointer-events-none absolute inset-0 transition-opacity ${cropStyle ? "size-full" : "size-full object-cover"} ${videoLoaded || !item.data.placeholderDataUrl ? "opacity-100" : "opacity-0"}`}
				>
					{hasEnteredViewport && videoSrc ? (
						<source
							key={videoSrc}
							src={videoSrc}
							type={
								videoSrc === originalMediaUrl ? item.data.mimeType : "video/mp4"
							}
						/>
					) : null}
				</video>
			) : hasEnteredViewport && imageSrc ? (
				<Image
					ref={imageRef}
					fill
					alt={item.data.caption ?? "Media item"}
					className={`pointer-events-none absolute inset-0 transition-opacity ${cropStyle ? "size-full" : "size-full object-cover"} ${imageLoaded || !item.data.placeholderDataUrl ? "opacity-100" : "opacity-0"}`}
					decoding="async"
					fetchPriority="low"
					loading="lazy"
					sizes="(min-width: 90rem) 20vw, 50vw"
					src={imageSrc}
					unoptimized
					onLoad={handleImageLoadAndMeasure}
					onError={() => {
						if (imageSrc !== originalMediaUrl) {
							setImageTransformFailed(true);
						}
					}}
				/>
			) : null}
		</>
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
