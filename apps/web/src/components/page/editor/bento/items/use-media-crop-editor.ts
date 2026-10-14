"use client";

import type { NormalizedCrop } from "@grabbin/api";
import {
	type SyntheticEvent,
	useCallback,
	useEffect,
	useRef,
	useState,
} from "react";
import type {
	BentoCommand,
	BentoItem,
} from "@/features/page/editor/state/bento-types";
import {
	getCenteredMediaCrop,
	getMediaCropStyle,
	isCropCompatible,
} from "@/features/page/editor/state/media-crop";
import { useMediaCropInteraction } from "@/hooks/use-media-crop-interaction";
import { useMediaCrop } from "./media-crop-provider";

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
	const mediaSourceRef = useRef({
		mediaUrl: item.data.mediaUrl,
		mimeType: item.data.mimeType,
	});
	const [draftCrop, setDraftCrop] = useState<NormalizedCrop | undefined>();
	const currentBreakpoint = crop.breakpoint;
	const isCropOpen = crop.isOpen;
	const cancelCrop = crop.cancel;
	const registerActions = crop.registerActions;
	const setDragging = crop.setDragging;
	const persistedCrop = item.data.crop?.[currentBreakpoint];
	const previousBreakpointRef = useRef(currentBreakpoint);
	const interaction = useMediaCropInteraction({
		frameRef,
		isCropOpen,
		draftCrop,
		onDraftCropChange: setDraftCrop,
		onDraggingChange: setDragging,
	});
	const { sourceSize, frameSize } = interaction;

	useEffect(() => {
		if (previousBreakpointRef.current !== currentBreakpoint && isCropOpen) {
			cancelCrop();
		}
		previousBreakpointRef.current = currentBreakpoint;
	}, [cancelCrop, currentBreakpoint, isCropOpen]);

	useEffect(() => {
		const sourceChanged =
			mediaSourceRef.current.mediaUrl !== item.data.mediaUrl ||
			mediaSourceRef.current.mimeType !== item.data.mimeType;
		mediaSourceRef.current = {
			mediaUrl: item.data.mediaUrl,
			mimeType: item.data.mimeType,
		};
		if (!sourceChanged) return;
		interaction.resetSourceSize();
		interaction.resetDrag();
	}, [
		interaction.resetDrag,
		interaction.resetSourceSize,
		item.data.mediaUrl,
		item.data.mimeType,
	]);

	useEffect(() => {
		if (mode !== "edit" && isCropOpen) cancelCrop();
	}, [cancelCrop, isCropOpen, mode]);

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
	useEffect(() => {
		if (!isCropOpen || draftCrop || !centeredCrop) return;
		setDraftCrop(getInitialCrop());
	}, [centeredCrop, draftCrop, getInitialCrop, isCropOpen]);
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
					interaction.resetDrag();
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
					interaction.resetDrag();
					setDraftCrop(undefined);
				},
			}),
		[canApply, currentBreakpoint, interaction.resetDrag, registerActions],
	);
	const handleImageLoad = useCallback(
		(event: SyntheticEvent<HTMLImageElement>) => {
			interaction.handleImageLoad(event.currentTarget);
		},
		[interaction.handleImageLoad],
	);
	const handleVideoLoadedMetadata = interaction.handleVideoLoadedMetadata;
	useEffect(() => {
		const image = imageRef.current;
		if (image?.complete && image.naturalWidth > 0) {
			interaction.updateSourceSize(image.naturalWidth, image.naturalHeight);
			return;
		}
		const video = videoRef.current;
		if (video && video.readyState >= 1) {
			interaction.updateSourceSize(video.videoWidth, video.videoHeight);
		}
	}, [interaction.updateSourceSize]);

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
		handleCropPointerDown: interaction.handlePointerDown,
		handleCropPointerMove: interaction.handlePointerMove,
		handleCropPointerEnd: interaction.handlePointerEnd,
	};
}
