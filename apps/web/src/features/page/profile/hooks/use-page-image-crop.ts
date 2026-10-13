import type { PageImageCrop } from "@grabbin/api";
import { useCallback, useEffect, useRef, useState } from "react";
import { useMediaCropInteraction } from "@/hooks/use-media-crop-interaction";
import {
	getCenteredMediaCrop,
	getMediaCropStyle,
	isCropCompatible,
} from "@/lib/bento/media-crop";

export function usePageImageCrop({
	value,
	crop,
	onCropChange,
	onImageLoaded,
}: {
	value: string;
	crop?: PageImageCrop | null;
	onCropChange?: (crop: PageImageCrop | null) => void;
	onImageLoaded: (loadedUrl: string) => void;
}) {
	const frameRef = useRef<HTMLButtonElement>(null);
	const imageRef = useRef<HTMLImageElement>(null);
	const [cropOpen, setCropOpen] = useState(false);
	const [draftCrop, setDraftCrop] = useState<PageImageCrop>();
	const interaction = useMediaCropInteraction({
		frameRef,
		isCropOpen: cropOpen,
		draftCrop,
		onDraftCropChange: setDraftCrop,
	});
	const { sourceSize, frameSize } = interaction;
	useEffect(() => {
		const image = imageRef.current;
		if (!image?.complete || !image.naturalWidth) return;
		interaction.updateSourceSize(image.naturalWidth, image.naturalHeight);
	}, [interaction.updateSourceSize, value]);

	const handleImageLoad = useCallback(
		(image: HTMLImageElement) => {
			interaction.handleImageLoad(image);
			onImageLoaded(value);
		},
		[interaction.handleImageLoad, onImageLoaded, value],
	);

	const centeredCrop =
		sourceSize.width > 0 &&
		sourceSize.height > 0 &&
		frameSize.width > 0 &&
		frameSize.height > 0
			? getCenteredMediaCrop(sourceSize, frameSize)
			: undefined;
	const renderedCrop = cropOpen
		? (draftCrop ?? centeredCrop)
		: crop && isCropCompatible(crop, sourceSize, frameSize)
			? crop
			: centeredCrop;

	function openCrop() {
		setDraftCrop(renderedCrop);
		setCropOpen(true);
	}

	const resetDraft = useCallback(() => {
		interaction.resetDrag();
		setDraftCrop(undefined);
		setCropOpen(false);
	}, [interaction.resetDrag]);
	const closeCrop = useCallback(() => {
		if (draftCrop) onCropChange?.(draftCrop);
		resetDraft();
	}, [draftCrop, onCropChange, resetDraft]);

	return {
		frameRef,
		imageRef,
		cropOpen,
		sourceSize,
		renderedCrop,
		cropStyle: renderedCrop ? getMediaCropStyle(renderedCrop) : undefined,
		controlSize: Math.max(
			32,
			Math.min(
				40,
				Math.round(Math.min(frameSize.width, frameSize.height) * 0.25),
			),
		),
		handleImageLoad,
		openCrop,
		closeCrop,
		resetDraft,
		handlePointerDown: interaction.handlePointerDown,
		handlePointerMove: interaction.handlePointerMove,
		handlePointerEnd: interaction.handlePointerEnd,
	};
}
