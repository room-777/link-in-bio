import type { NormalizedCrop } from "@grabbin/api";
import {
	type Dispatch,
	type PointerEvent as ReactPointerEvent,
	type RefObject,
	type SetStateAction,
	type SyntheticEvent,
	useCallback,
	useEffect,
	useRef,
	useState,
} from "react";
import { moveMediaCrop } from "@/features/page/utils/media-crop";

type MediaSize = { width: number; height: number };

export function useMediaCropInteraction<TFrame extends HTMLElement>({
	frameRef,
	isCropOpen,
	draftCrop,
	onDraftCropChange,
	onDraggingChange,
}: {
	frameRef: RefObject<TFrame | null>;
	isCropOpen: boolean;
	draftCrop: NormalizedCrop | undefined;
	onDraftCropChange: Dispatch<SetStateAction<NormalizedCrop | undefined>>;
	onDraggingChange?: (isDragging: boolean) => void;
}) {
	const [sourceSize, setSourceSize] = useState<MediaSize>({
		width: 0,
		height: 0,
	});
	const [frameSize, setFrameSize] = useState<MediaSize>({
		width: 0,
		height: 0,
	});
	const dragRef = useRef<{
		pointerId: number;
		startX: number;
		startY: number;
		startCrop: NormalizedCrop;
	} | null>(null);

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
	}, [frameRef]);

	const updateSourceSize = useCallback((width: number, height: number) => {
		if (width > 0 && height > 0) setSourceSize({ width, height });
	}, []);
	const handleImageLoad = useCallback(
		(image: HTMLImageElement) =>
			updateSourceSize(image.naturalWidth, image.naturalHeight),
		[updateSourceSize],
	);
	const handleVideoLoadedMetadata = useCallback(
		(event: SyntheticEvent<HTMLVideoElement>) =>
			updateSourceSize(
				event.currentTarget.videoWidth,
				event.currentTarget.videoHeight,
			),
		[updateSourceSize],
	);
	const resetSourceSize = useCallback(() => {
		setSourceSize({ width: 0, height: 0 });
	}, []);

	const handlePointerDown = useCallback(
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
			onDraggingChange?.(true);
		},
		[draftCrop, isCropOpen, onDraggingChange],
	);
	const handlePointerMove = useCallback(
		(event: ReactPointerEvent<HTMLButtonElement>) => {
			const drag = dragRef.current;
			if (!drag || !draftCrop || drag.pointerId !== event.pointerId) return;
			event.preventDefault();
			onDraftCropChange(
				moveMediaCrop(
					drag.startCrop,
					event.clientX - drag.startX,
					event.clientY - drag.startY,
					frameSize,
				),
			);
		},
		[draftCrop, frameSize, onDraftCropChange],
	);
	const handlePointerEnd = useCallback(
		(event: ReactPointerEvent<HTMLButtonElement>) => {
			if (!dragRef.current || dragRef.current.pointerId !== event.pointerId)
				return;
			dragRef.current = null;
			if (event.currentTarget.hasPointerCapture(event.pointerId)) {
				event.currentTarget.releasePointerCapture(event.pointerId);
			}
			onDraggingChange?.(false);
		},
		[onDraggingChange],
	);
	const resetDrag = useCallback(() => {
		dragRef.current = null;
		onDraggingChange?.(false);
	}, [onDraggingChange]);

	return {
		sourceSize,
		frameSize,
		updateSourceSize,
		resetSourceSize,
		handleImageLoad,
		handleVideoLoadedMetadata,
		handlePointerDown,
		handlePointerMove,
		handlePointerEnd,
		resetDrag,
	};
}
