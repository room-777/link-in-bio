"use client";

import type { NormalizedCrop } from "@grabbin/api";
import {
	type PointerEvent as ReactPointerEvent,
	type SyntheticEvent,
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

type MediaItem = Extract<BentoItem, { type: "media" }>;

export function useMediaCropEditor({
	item,
	mode,
	onCommand,
}: {
	item: MediaItem;
	mode: "view" | "edit";
	onCommand?: (command: BentoCommand) => void;
}) {
	const crop = useMediaCrop();
	const frameRef = useRef<HTMLDivElement>(null);
	const imageRef = useRef<HTMLImageElement>(null);
	const videoRef = useRef<HTMLVideoElement>(null);
	const dragRef = useRef<{
		pointerId: number;
		startX: number;
		startY: number;
		startCrop: NormalizedCrop;
	} | null>(null);
	const mediaSourceRef = useRef({
		mediaUrl: item.data.mediaUrl,
		mimeType: item.data.mimeType,
	});
	const [sourceSize, setSourceSize] = useState({ width: 0, height: 0 });
	const [frameSize, setFrameSize] = useState({ width: 0, height: 0 });
	const [draftCrop, setDraftCrop] = useState<NormalizedCrop | undefined>();
	const currentBreakpoint = crop.breakpoint;
	const isCropOpen = crop.isOpen;
	const cancelCrop = crop.cancel;
	const registerActions = crop.registerActions;
	const setDragging = crop.setDragging;
	const persistedCrop = item.data.crop?.[currentBreakpoint];
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

	const centeredCrop =
		sourceSize.width > 0 && frameSize.width > 0 && frameSize.height > 0
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

	const updateSourceSize = useCallback((width: number, height: number) => {
		if (width > 0 && height > 0) setSourceSize({ width, height });
	}, []);
	const handleImageLoad = useCallback(
		(event: SyntheticEvent<HTMLImageElement>) => {
			updateSourceSize(
				event.currentTarget.naturalWidth,
				event.currentTarget.naturalHeight,
			);
		},
		[updateSourceSize],
	);
	const handleVideoLoadedMetadata = useCallback(
		(event: SyntheticEvent<HTMLVideoElement>) => {
			updateSourceSize(
				event.currentTarget.videoWidth,
				event.currentTarget.videoHeight,
			);
		},
		[updateSourceSize],
	);
	useEffect(() => {
		const image = imageRef.current;
		if (image?.complete && image.naturalWidth > 0) {
			updateSourceSize(image.naturalWidth, image.naturalHeight);
			return;
		}
		const video = videoRef.current;
		if (video && video.readyState >= 1) {
			updateSourceSize(video.videoWidth, video.videoHeight);
		}
	}, [item.data.mediaUrl, item.data.mimeType, updateSourceSize]);

	const handleCropPointerDown = useCallback(
		(event: ReactPointerEvent<HTMLButtonElement>) => {
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
			setDragging(true);
		},
		[draftCrop, isCropOpen, setDragging],
	);
	const handleCropPointerMove = useCallback(
		(event: ReactPointerEvent<HTMLButtonElement>) => {
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
		},
		[draftCrop, frameSize],
	);
	const handleCropPointerEnd = useCallback(
		(event: ReactPointerEvent<HTMLButtonElement>) => {
			if (!dragRef.current || dragRef.current.pointerId !== event.pointerId)
				return;
			dragRef.current = null;
			if (event.currentTarget.hasPointerCapture(event.pointerId)) {
				event.currentTarget.releasePointerCapture(event.pointerId);
			}
			setDragging(false);
		},
		[setDragging],
	);

	return {
		frameRef,
		imageRef,
		videoRef,
		currentCrop,
		cropStyle,
		hasSourceSize: sourceSize.width > 0 && sourceSize.height > 0,
		isCropOpen,
		isDragging: crop.isDragging,
		handleImageLoad,
		handleVideoLoadedMetadata,
		handleCropPointerDown,
		handleCropPointerMove,
		handleCropPointerEnd,
	};
}
