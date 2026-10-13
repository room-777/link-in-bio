"use client";

import "react-grid-layout/css/styles.css";

import type { BentoBreakpoint } from "@grabbin/bento-layout";
import {
	bentoContainerPadding,
	bentoGridMetrics,
	getBentoItemRadius,
	getBentoWidth,
	getColumns,
	inferPresetFromLayout,
	validateBentoLayout,
} from "@grabbin/bento-layout";
import { useReducedMotion } from "motion/react";
import type { CSSProperties } from "react";
import {
	useCallback,
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import ReactGridLayout, {
	type EventCallback,
	useContainerWidth,
} from "react-grid-layout";
import { fastVerticalCompactor } from "react-grid-layout/extras";
import {
	resolveBentoDragLayout,
	toBentoLayoutMap,
} from "@/features/page/editor/state/bento-drag";
import type {
	BentoCommand,
	BentoItem as BentoItemData,
} from "@/features/page/editor/state/bento-types";
import { useBentoDragMotion } from "@/hooks/use-bento-drag-motion";
import { BentoItemShell } from "./bento-item-shell";

type BentoSectionProps = {
	handle?: string;
	items: readonly BentoItemData[];
	initialItemIds?: ReadonlySet<string>;
	entryAnimationRevision?: number;
	entryReady?: boolean;
	onReady?: () => void;
	mode?: "view" | "edit";
	breakpoint?: BentoBreakpoint;
	autoFocusItemId?: string | null;
	onAutoFocus?: (itemId: string) => void;
	onCommand?: (command: BentoCommand) => void;
	onRefreshLinkMetadata?: (itemId: string) => Promise<void>;
	onLinkImageSelect?: (itemId: string, file: File) => void | Promise<void>;
};

const WIDE_CONTAINER_MIN_WIDTH = getBentoWidth("wide");

export default function BentoSection({
	handle,
	items,
	initialItemIds: initialItemIdsProp,
	entryAnimationRevision = 0,
	entryReady = true,
	onReady,
	mode = "view",
	breakpoint: requestedBreakpoint,
	autoFocusItemId = null,
	onAutoFocus,
	onCommand,
	onRefreshLinkMetadata,
	onLinkImageSelect,
}: BentoSectionProps) {
	const initialItemIds =
		initialItemIdsProp ?? new Set(items.map((item) => item.id));
	const {
		width: containerWidth,
		containerRef,
		mounted,
	} = useContainerWidth({
		measureBeforeMount: true,
	});

	const measuredBreakpoint =
		mounted && containerWidth >= WIDE_CONTAINER_MIN_WIDTH ? "wide" : "compact";
	useEffect(() => {
		if (mounted) onReady?.();
	}, [mounted, onReady]);
	const breakpoint = requestedBreakpoint ?? measuredBreakpoint;
	const cols = getColumns(breakpoint);
	const bentoWidth = getBentoWidth(breakpoint);
	const bottomPaddingClass =
		mode === "edit"
			? breakpoint === "wide"
				? "pb-80"
				: "pb-64"
			: breakpoint === "compact"
				? "pb-64"
				: "pb-24";
	const dragStartLayoutRef = useRef<ReturnType<typeof toBentoLayoutMap> | null>(
		null,
	);
	const knownItemIdsRef = useRef(new Set(initialItemIds));
	const enteringItemFramesRef = useRef(new Map<string, number>());
	const newItemScrollFramesRef = useRef(new Map<string, number>());
	const [enteringItemIds, setEnteringItemIds] = useState<ReadonlySet<string>>(
		new Set(),
	);
	const [initialEntryItemIds, setInitialEntryItemIds] = useState(
		() => new Set(initialItemIds),
	);
	const [layoutRevision, setLayoutRevision] = useState(0);
	const [draggingItemId, setDraggingItemId] = useState<string | null>(null);
	const dragMotion = useBentoDragMotion();
	const reduceMotion = useReducedMotion();
	const previousEntryAnimationRevisionRef = useRef(entryAnimationRevision);
	useLayoutEffect(() => {
		if (previousEntryAnimationRevisionRef.current === entryAnimationRevision) {
			return;
		}
		previousEntryAnimationRevisionRef.current = entryAnimationRevision;
		setInitialEntryItemIds(
			new Set(
				items
					.filter((item) => !enteringItemIds.has(item.id))
					.map((item) => item.id),
			),
		);
	}, [entryAnimationRevision, enteringItemIds, items]);
	useEffect(() => {
		if (reduceMotion && entryReady && initialEntryItemIds.size > 0) {
			setInitialEntryItemIds(new Set());
		}
	}, [entryReady, initialEntryItemIds.size, reduceMotion]);
	useEffect(() => {
		if (mode !== "edit" || !mounted) return;
		const newItemIds = items
			.filter((item) => !knownItemIdsRef.current.has(item.id))
			.map((item) => item.id);
		knownItemIdsRef.current = new Set(items.map((item) => item.id));
		if (newItemIds.length === 0) return;

		setInitialEntryItemIds((current) => {
			const next = new Set(current);
			for (const itemId of newItemIds) next.delete(itemId);
			return next;
		});
		if (!reduceMotion) {
			setEnteringItemIds((current) => new Set([...current, ...newItemIds]));
		}
		for (const itemId of newItemIds) {
			const firstFrame = window.requestAnimationFrame(() => {
				const secondFrame = window.requestAnimationFrame(() => {
					enteringItemFramesRef.current.delete(itemId);
					const itemShell = document.querySelector<HTMLElement>(
						`[data-bento-item-id="${CSS.escape(itemId)}"]`,
					);
					itemShell?.scrollIntoView({
						behavior: window.matchMedia("(prefers-reduced-motion: reduce)")
							.matches
							? "auto"
							: "smooth",
						block: "nearest",
						inline: "nearest",
					});
					newItemScrollFramesRef.current.delete(itemId);
				});
				enteringItemFramesRef.current.set(itemId, secondFrame);
				newItemScrollFramesRef.current.set(itemId, secondFrame);
			});
			enteringItemFramesRef.current.set(itemId, firstFrame);
		}
	}, [items, mode, mounted, reduceMotion]);
	useEffect(
		() => () => {
			for (const frame of enteringItemFramesRef.current.values()) {
				window.cancelAnimationFrame(frame);
			}
			for (const frame of newItemScrollFramesRef.current.values()) {
				window.cancelAnimationFrame(frame);
			}
		},
		[],
	);
	const handlePopInComplete = useCallback((itemId: string) => {
		setEnteringItemIds((current) => {
			if (!current.has(itemId)) return current;
			const next = new Set(current);
			next.delete(itemId);
			return next;
		});
	}, []);
	const layout = useMemo(
		() =>
			items.map((item) => ({
				i: item.id,
				...item.layouts[breakpoint],
				isResizable: false,
				resizeHandles: [],
			})),
		[breakpoint, items],
	);
	const draggingItem = items.find((item) => item.id === draggingItemId);
	const draggingPreset = draggingItem
		? inferPresetFromLayout(
				draggingItem.type,
				draggingItem.layouts[breakpoint],
				breakpoint,
			)
		: null;
	const placeholderRadius = draggingItem
		? getBentoItemRadius(draggingItem.type, draggingPreset)
		: undefined;
	const handleDragStart: EventCallback = useCallback(
		(currentLayout, oldItem, newItem, placeholder, event, element) => {
			dragMotion.onDragStart(
				currentLayout,
				oldItem,
				newItem,
				placeholder,
				event,
				element,
			);
			dragStartLayoutRef.current = toBentoLayoutMap(currentLayout);
			setDraggingItemId(oldItem?.i ?? null);
		},
		[dragMotion],
	);
	const handleDrag: EventCallback = useCallback(
		(currentLayout, oldItem, newItem, placeholder, event, element) => {
			dragMotion.onDrag(
				currentLayout,
				oldItem,
				newItem,
				placeholder,
				event,
				element,
			);
		},
		[dragMotion],
	);
	const handleDragStop: EventCallback = useCallback(
		(nextLayout, oldItem, newItem, placeholder, event, element) => {
			dragMotion.onDragStop(
				nextLayout,
				oldItem,
				newItem,
				placeholder,
				event,
				element,
			);
			const targetItem = placeholder ?? newItem;
			const resolved = resolveBentoDragLayout({
				nextLayout,
				startLayout: dragStartLayoutRef.current ?? toBentoLayoutMap(layout),
				columns: cols,
				activeItemId: oldItem?.i,
				position: targetItem ? { x: targetItem.x, y: targetItem.y } : undefined,
			});
			dragStartLayoutRef.current = null;
			setDraggingItemId(null);
			if (resolved.outsideGrid) setLayoutRevision((revision) => revision + 1);
			if (validateBentoLayout(resolved.layout, cols)) {
				onCommand?.({
					type: "replace-layout",
					breakpoint,
					layout: resolved.layout,
				});
			}
		},
		[breakpoint, cols, dragMotion, layout, onCommand],
	);
	const lastInitialEntryItemId = [...items]
		.reverse()
		.find((item) => initialEntryItemIds.has(item.id))?.id;

	const section = (
		<section
			ref={containerRef}
			className={`bento-section-shell flex min-w-full max-w-full shrink-0 justify-center overflow-visible ${bottomPaddingClass}`}
			style={mounted ? { width: bentoWidth } : undefined}
			aria-label="Page content"
		>
			{mounted ? (
				<ReactGridLayout
					key={`${breakpoint}-${layoutRevision}`}
					className={[
						"bento-layout max-w-full overflow-visible",
						mode === "edit" ? "is-edit-mode" : null,
						draggingItem?.type === "section" ? "is-dragging-section" : null,
					]
						.filter(Boolean)
						.join(" ")}
					style={
						{
							width: bentoWidth,
							"--bento-section-offset": `${bentoGridMetrics[breakpoint].margin[1] / 2}px`,
							"--bento-placeholder-radius": placeholderRadius
								? `${placeholderRadius}px`
								: undefined,
						} as CSSProperties
					}
					layout={layout}
					width={bentoWidth}
					gridConfig={{
						cols,
						rowHeight: bentoGridMetrics[breakpoint].rowHeight,
						margin: bentoGridMetrics[breakpoint].margin,
						containerPadding: bentoContainerPadding,
					}}
					dragConfig={{
						enabled: mode === "edit",
						bounded: false,
						cancel:
							"input, textarea, button, a, [role='radio'], [data-bento-item-drag-cancel='true']",
					}}
					resizeConfig={{ enabled: false }}
					autoSize
					compactor={fastVerticalCompactor}
					onDragStart={mode === "edit" ? handleDragStart : undefined}
					onDrag={mode === "edit" ? handleDrag : undefined}
					onDragStop={mode === "edit" ? handleDragStop : undefined}
				>
					{items.map((item, index) => {
						const isInitialEntryItem = initialEntryItemIds.has(item.id);
						const itemShell = (
							<BentoItemShell
								item={item}
								handle={handle}
								breakpoint={breakpoint}
								mode={mode}
								autoFocus={item.id === autoFocusItemId}
								onAutoFocus={
									item.id === autoFocusItemId
										? () => onAutoFocus?.(item.id)
										: undefined
								}
								onCommand={onCommand}
								isAnyItemDragging={draggingItemId !== null}
								isEntering={enteringItemIds.has(item.id)}
								isInitialEntryItem={isInitialEntryItem}
								entryReady={entryReady}
								entryDelay={index * 0.1}
								reduceMotion={Boolean(reduceMotion)}
								onEntryComplete={
									!reduceMotion && item.id === lastInitialEntryItemId
										? () => {
												setInitialEntryItemIds(new Set());
											}
										: undefined
								}
								onPopInComplete={handlePopInComplete}
								onRefreshLinkMetadata={onRefreshLinkMetadata}
								onLinkImageSelect={onLinkImageSelect}
							/>
						);

						return <div key={item.id}>{itemShell}</div>;
					})}
				</ReactGridLayout>
			) : null}
		</section>
	);
	return (
		<div className={mode === "edit" ? "w-full min-w-0 shrink-0" : "contents"}>
			{section}
		</div>
	);
}
