"use client";

import type { NormalizedCrop } from "@grabbin/api";
import type { PresetName } from "@grabbin/bento-layout";
import { Button } from "@grabbin/ui/components/button";
import { LoaderCircle, X } from "lucide-react";
import {
	type PointerEvent as ReactPointerEvent,
	useCallback,
	useEffect,
	useRef,
	useState,
} from "react";

import type { BentoCommand, BentoItem } from "@/lib/bento/bento-types";
import {
	getCenteredMediaCrop,
	getMediaCropStyle,
	isCropCompatible,
	moveMediaCrop,
} from "@/lib/bento/media-crop";
import { useMediaCrop } from "./media-crop-context";
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
	const crop = useMediaCrop();
	const frameRef = useRef<HTMLDivElement>(null);
	const imageRef = useRef<HTMLImageElement>(null);
	const videoRef = useRef<HTMLVideoElement>(null);
	const currentBreakpoint = crop.breakpoint;
	const isCropOpen = crop.isOpen;
	const cancelCrop = crop.cancel;
	const dragRef = useRef<{
		pointerId: number;
		startX: number;
		startY: number;
		startCrop: NormalizedCrop;
	} | null>(null);
	const [sourceSize, setSourceSize] = useState({ width: 0, height: 0 });
	const [frameSize, setFrameSize] = useState({ width: 0, height: 0 });
	const [draftCrop, setDraftCrop] = useState<NormalizedCrop | undefined>(
		undefined,
	);
	const mediaSourceRef = useRef({
		mediaUrl: item.data.mediaUrl,
		mimeType: item.data.mimeType,
	});
	const persistedCrop =
		item.data.crop?.[currentBreakpoint === "wide" ? "wide" : "compact"];
	const previousBreakpointRef = useRef(currentBreakpoint);
	useEffect(() => {
		if (previousBreakpointRef.current !== currentBreakpoint && isCropOpen) {
			cancelCrop();
		}
		previousBreakpointRef.current = currentBreakpoint;
	}, [cancelCrop, currentBreakpoint, isCropOpen]);
	useEffect(() => {
		if (mode !== "edit" && isCropOpen) cancelCrop();
	}, [cancelCrop, isCropOpen, mode]);
	useEffect(() => {
		const sourceChanged =
			mediaSourceRef.current.mediaUrl !== item.data.mediaUrl ||
			mediaSourceRef.current.mimeType !== item.data.mimeType;
		mediaSourceRef.current = {
			mediaUrl: item.data.mediaUrl,
			mimeType: item.data.mimeType,
		};
		if (!sourceChanged) return;
		setMediaReady(false);
		setSourceSize({ width: 0, height: 0 });
		dragRef.current = null;
	}, [item.data.mediaUrl, item.data.mimeType]);

	useEffect(() => {
		const frame = frameRef.current;
		if (!frame) return;
		const update = () => {
			const rect = frame.getBoundingClientRect();
			setFrameSize({ width: rect.width, height: rect.height });
		};
		update();
		const observer = new ResizeObserver(update);
		observer.observe(frame);
		return () => observer.disconnect();
	}, []);

	const currentFrameSize = frameSize.width > 0 && frameSize.height > 0;
	const centeredCrop =
		sourceSize.width > 0 && currentFrameSize
			? getCenteredMediaCrop(sourceSize, frameSize)
			: undefined;
	const currentCrop = isCropOpen
		? (draftCrop ?? centeredCrop)
		: persistedCrop && isCropCompatible(persistedCrop, sourceSize, frameSize)
			? persistedCrop
			: undefined;
	const cropStyle =
		currentCrop && isCropCompatible(currentCrop, sourceSize, frameSize)
			? getMediaCropStyle(currentCrop)
			: undefined;

	const getInitialCrop = useCallback(() => {
		if (!centeredCrop) return undefined;
		return persistedCrop &&
			isCropCompatible(persistedCrop, sourceSize, frameSize)
			? persistedCrop
			: centeredCrop;
	}, [centeredCrop, frameSize, persistedCrop, sourceSize]);
	const canApply = Boolean(isCropOpen && cropStyle && draftCrop && onCommand);

	const actionsRef = useRef({
		canApply,
		draftCrop,
		getInitialCrop,
		item,
		onCommand,
	});
	actionsRef.current = { canApply, draftCrop, getInitialCrop, item, onCommand };
	const { registerActions } = crop;
	useEffect(
		() =>
			registerActions({
				canApply,
				onOpen: () => setDraftCrop(actionsRef.current.getInitialCrop()),
				onCancel: () => {
					dragRef.current = null;
					setDraftCrop(undefined);
				},
				onApply: () => {
					const {
						canApply: ready,
						draftCrop: nextCrop,
						item: currentItem,
						onCommand: dispatch,
					} = actionsRef.current;
					if (!ready || !nextCrop || !dispatch) return;
					dispatch({
						type: "update-data",
						itemId: currentItem.id,
						data: {
							...currentItem.data,
							crop: {
								...currentItem.data.crop,
								[currentBreakpoint]: nextCrop,
							},
						},
					});
					setDraftCrop(undefined);
				},
			}),
		[canApply, currentBreakpoint, registerActions],
	);

	const updateSourceSize = (width: number, height: number) => {
		if (width > 0 && height > 0) setSourceSize({ width, height });
	};
	const handleCropPointerDown = (
		event: ReactPointerEvent<HTMLButtonElement>,
	) => {
		if (
			!isCropOpen ||
			!draftCrop ||
			(event.pointerType === "mouse" && event.button !== 0)
		)
			return;
		event.preventDefault();
		event.currentTarget.setPointerCapture(event.pointerId);
		dragRef.current = {
			pointerId: event.pointerId,
			startX: event.clientX,
			startY: event.clientY,
			startCrop: draftCrop,
		};
		crop.setDragging(true);
	};
	const handleCropPointerMove = (
		event: ReactPointerEvent<HTMLButtonElement>,
	) => {
		const drag = dragRef.current;
		if (!drag || !draftCrop || drag.pointerId !== event.pointerId) return;
		event.preventDefault();
		setDraftCrop(
			moveMediaCrop(
				drag.startCrop,
				event.clientX - drag.startX,
				event.clientY - drag.startY,
				frameSize,
			),
		);
	};
	const handleCropPointerEnd = (
		event: ReactPointerEvent<HTMLButtonElement>,
	) => {
		if (!dragRef.current || dragRef.current.pointerId !== event.pointerId)
			return;
		dragRef.current = null;
		if (event.currentTarget.hasPointerCapture(event.pointerId)) {
			event.currentTarget.releasePointerCapture(event.pointerId);
		}
		crop.setDragging(false);
	};
	const media = item.data.mediaUrl ? (
		isVideo ? (
			<video
				ref={videoRef}
				autoPlay
				loop
				muted
				playsInline
				preload="metadata"
				src={item.data.mediaUrl}
				onLoadedMetadata={() => {
					if (videoRef.current)
						updateSourceSize(
							videoRef.current.videoWidth,
							videoRef.current.videoHeight,
						);
					setMediaReady(true);
				}}
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
				onLoad={() => {
					if (imageRef.current)
						updateSourceSize(
							imageRef.current.naturalWidth,
							imageRef.current.naturalHeight,
						);
					setMediaReady(true);
				}}
			/>
		)
	) : null;
	return (
		<div
			ref={frameRef}
			data-media-frame="true"
			data-media-preset={preset}
			data-bento-item-crop-open={isCropOpen ? "true" : undefined}
			className={`relative size-full overflow-hidden rounded-[inherit] bg-muted/30 ${mediaReady && !item.data.mediaUrl?.startsWith("data:") ? "surface-line" : ""} ${isCropOpen ? "overflow-visible!" : ""}`}
		>
			{cropStyle ? (
				<div
					className="absolute overflow-hidden rounded-[inherit]"
					style={cropStyle}
				>
					{media}
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
						className={`absolute z-20 cursor-grab! touch-none rounded-[inherit] border-0 bg-transparent p-0 outline-none ${crop.isDragging ? "cursor-grabbing!" : ""}`}
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
