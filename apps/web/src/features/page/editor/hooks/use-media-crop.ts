import {
	type RefObject,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";

type CropActions = {
	canApply: boolean;
	onOpen(): void;
	onCancel(): void;
	onApply(): void;
};

type MediaCropValue = {
	breakpoint: "wide" | "compact";
	isOpen: boolean;
	isDragging: boolean;
	canApply: boolean;
	open(): void;
	cancel(): void;
	apply(): void;
	setDragging(value: boolean): void;
	registerActions(actions: CropActions): () => void;
};

export function useMediaCrop({
	containerRef,
	breakpoint,
}: {
	containerRef: RefObject<HTMLElement | null>;
	breakpoint: "wide" | "compact";
}) {
	const [isOpen, setIsOpen] = useState(false);
	const [isDragging, setIsDragging] = useState(false);
	const [canApply, setCanApply] = useState(false);
	const actionsRef = useRef<CropActions | null>(null);

	const registerActions = useCallback((actions: CropActions) => {
		actionsRef.current = actions;
		setCanApply(actions.canApply);
		return () => {
			if (actionsRef.current !== actions) return;
			actionsRef.current = null;
			setCanApply(false);
		};
	}, []);
	const open = useCallback(() => {
		actionsRef.current?.onOpen();
		setIsOpen(true);
	}, []);
	const cancel = useCallback(() => {
		actionsRef.current?.onCancel();
		setIsOpen(false);
		setIsDragging(false);
	}, []);
	const apply = useCallback(() => {
		if (!actionsRef.current?.canApply) return;
		actionsRef.current.onApply();
		setIsOpen(false);
		setIsDragging(false);
	}, []);

	useEffect(() => {
		if (!isOpen) return;
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape") cancel();
		};
		const onPointerDown = (event: PointerEvent) => {
			if (
				event.target instanceof Node &&
				containerRef.current?.contains(event.target)
			)
				return;
			cancel();
		};
		window.addEventListener("keydown", onKeyDown);
		document.addEventListener("pointerdown", onPointerDown, true);
		return () => {
			window.removeEventListener("keydown", onKeyDown);
			document.removeEventListener("pointerdown", onPointerDown, true);
		};
	}, [cancel, containerRef, isOpen]);

	return useMemo<MediaCropValue>(
		() => ({
			breakpoint,
			isOpen,
			isDragging,
			canApply,
			open,
			cancel,
			apply,
			setDragging: setIsDragging,
			registerActions,
		}),
		[
			apply,
			breakpoint,
			canApply,
			cancel,
			isDragging,
			isOpen,
			open,
			registerActions,
		],
	);
}

export type MediaCrop = ReturnType<typeof useMediaCrop>;
