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
import { useBentoDragMotion } from "@/hooks/use-bento-drag-motion";
import {
	resolveBentoDragLayout,
	toBentoLayoutMap,
} from "@/lib/bento/bento-drag";
import type {
	BentoCommand,
	BentoItem as BentoItemData,
} from "@/lib/bento/bento-types";
import { BentoItemShell } from "./bento-item-shell";
import { MapViewportGate } from "./items/shared";

type BentoSectionProps = {
	items: readonly BentoItemData[];
	entryAnimationRevision?: number;
	entryReady?: boolean;
	onReady?: () => void;
	onEntryComplete?: () => void;
	mode?: "view" | "edit";
	breakpoint?: BentoBreakpoint;
	autoFocusItemId?: string | null;
	onAutoFocus?: (itemId: string) => void;
	onCommand?: (command: BentoCommand) => void;
	onRefreshLinkMetadata?: (itemId: string) => Promise<void>;
	onLinkImageSelect?: (itemId: string, file: File) => void | Promise<void>;
};

const WIDE_CONTAINER_MIN_WIDTH = getBentoWidth("wide");
const BENTO_ITEM_EXIT_DURATION = 180;

export default function BentoSection({
	items,
	entryAnimationRevision = 0,
	entryReady = true,
	onReady,
	onEntryComplete,
	mode = "view",
	breakpoint: requestedBreakpoint,
	autoFocusItemId = null,
	onAutoFocus,
	onCommand,
	onRefreshLinkMetadata,
	onLinkImageSelect,
}: BentoSectionProps) {
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
	const knownItemIdsRef = useRef(new Set<string>());
	const hasInitializedItemsRef = useRef(false);
	const enteringItemFramesRef = useRef(new Map<string, number>());
	const newItemScrollFramesRef = useRef(new Map<string, number>());
	const exitingItemTimersRef = useRef(new Map<string, number>());
	const previousItemsByIdRef = useRef(
		new Map(items.map((item) => [item.id, item])),
	);
	const [enteringItemIds, setEnteringItemIds] = useState<ReadonlySet<string>>(
		new Set(),
	);
	const [initialEntryItemIds, setInitialEntryItemIds] = useState(
		() => new Set(items.map((item) => item.id)),
	);
	const [exitingItems, setExitingItems] = useState<
		ReadonlyMap<string, BentoItemData>
	>(new Map());
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
		setInitialEntryItemIds(new Set(items.map((item) => item.id)));
	}, [entryAnimationRevision, items]);
	const emptyEntryCompletedRevisionRef = useRef<number | null>(null);
	useEffect(() => {
		if (
			mode !== "edit" ||
			!entryReady ||
			reduceMotion ||
			initialEntryItemIds.size > 0 ||
			items.length > 0 ||
			emptyEntryCompletedRevisionRef.current === entryAnimationRevision
		) {
			return;
		}
		emptyEntryCompletedRevisionRef.current = entryAnimationRevision;
		onEntryComplete?.();
	}, [
		entryAnimationRevision,
		entryReady,
		initialEntryItemIds.size,
		items.length,
		mode,
		reduceMotion,
		onEntryComplete,
	]);
	useEffect(() => {
		if (reduceMotion && entryReady) onEntryComplete?.();
	}, [entryReady, onEntryComplete, reduceMotion]);
	const displayItems = useMemo(() => {
		const itemIds = new Set(items.map((item) => item.id));
		return [
			...items,
			...[...exitingItems.entries()]
				.filter(([itemId]) => !itemIds.has(itemId))
				.map(([, item]) => item),
		];
	}, [exitingItems, items]);
	const startItemExit = useCallback((item: BentoItemData) => {
		if (exitingItemTimersRef.current.has(item.id)) return;
		setExitingItems((current) => new Map(current).set(item.id, item));
		exitingItemTimersRef.current.set(
			item.id,
			window.setTimeout(() => {
				setExitingItems((current) => {
					const next = new Map(current);
					next.delete(item.id);
					return next;
				});
				exitingItemTimersRef.current.delete(item.id);
			}, BENTO_ITEM_EXIT_DURATION),
		);
	}, []);
	useEffect(() => {
		if (mode !== "edit") return;
		const newItemIds = hasInitializedItemsRef.current
			? items
					.filter((item) => !knownItemIdsRef.current.has(item.id))
					.map((item) => item.id)
			: [];
		knownItemIdsRef.current = new Set(items.map((item) => item.id));
		hasInitializedItemsRef.current = true;
		if (newItemIds.length === 0) return;

		setEnteringItemIds((current) => new Set([...current, ...newItemIds]));
		for (const itemId of newItemIds) {
			const firstFrame = window.requestAnimationFrame(() => {
				const secondFrame = window.requestAnimationFrame(() => {
					setEnteringItemIds((current) => {
						const next = new Set(current);
						next.delete(itemId);
						return next;
					});
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
	}, [items, mode]);
	useEffect(() => {
		const currentItemsById = new Map(items.map((item) => [item.id, item]));
		for (const [itemId, previousItem] of previousItemsByIdRef.current) {
			if (!currentItemsById.has(itemId)) startItemExit(previousItem);
		}
		for (const itemId of currentItemsById.keys()) {
			const timer = exitingItemTimersRef.current.get(itemId);
			if (timer === undefined) continue;
			window.clearTimeout(timer);
			exitingItemTimersRef.current.delete(itemId);
			setExitingItems((current) => {
				const next = new Map(current);
				next.delete(itemId);
				return next;
			});
		}
		previousItemsByIdRef.current = currentItemsById;
	}, [items, startItemExit]);
	useEffect(
		() => () => {
			for (const frame of enteringItemFramesRef.current.values()) {
				window.cancelAnimationFrame(frame);
			}
			for (const frame of newItemScrollFramesRef.current.values()) {
				window.cancelAnimationFrame(frame);
			}
			for (const timer of exitingItemTimersRef.current.values()) {
				window.clearTimeout(timer);
			}
		},
		[],
	);
	const handleBentoCommand = useCallback(
		(command: BentoCommand) => {
			if (command.type === "delete-item") {
				const item = displayItems.find(
					(candidate) => candidate.id === command.itemId,
				);
				if (item) startItemExit(item);
			}
			onCommand?.(command);
		},
		[displayItems, onCommand, startItemExit],
	);
	const layout = useMemo(
		() =>
			displayItems.map((item) => ({
				i: item.id,
				...item.layouts[breakpoint],
				isResizable: false,
				resizeHandles: [],
			})),
		[breakpoint, displayItems],
	);
	const draggingItem = displayItems.find((item) => item.id === draggingItemId);
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
			const resolved = resolveBentoDragLayout({
				nextLayout,
				startLayout: dragStartLayoutRef.current ?? toBentoLayoutMap(layout),
				columns: cols,
			});
			dragStartLayoutRef.current = null;
			setDraggingItemId(null);
			if (resolved.outsideGrid) setLayoutRevision((revision) => revision + 1);
			if (validateBentoLayout(resolved.layout, cols)) {
				handleBentoCommand({
					type: "replace-layout",
					breakpoint,
					layout: resolved.layout,
				});
			}
		},
		[breakpoint, cols, dragMotion, handleBentoCommand, layout],
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
					]
						.filter(Boolean)
						.join(" ")}
					style={
						{
							width: bentoWidth,
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
					{displayItems.map((item, index) => {
						const preset = inferPresetFromLayout(
							item.type,
							item.layouts[breakpoint],
							breakpoint,
						);
						const itemRadius = getBentoItemRadius(item.type, preset);
						const isInitialEntryItem = initialEntryItemIds.has(item.id);
						const itemShell = (
							<BentoItemShell
								item={item}
								breakpoint={breakpoint}
								mode={mode}
								autoFocus={item.id === autoFocusItemId}
								onAutoFocus={
									item.id === autoFocusItemId
										? () => onAutoFocus?.(item.id)
										: undefined
								}
								onCommand={handleBentoCommand}
								isAnyItemDragging={draggingItemId !== null}
								isEntering={enteringItemIds.has(item.id)}
								isExiting={exitingItems.has(item.id)}
								isInitialEntryItem={isInitialEntryItem}
								entryReady={entryReady}
								entryDelay={index * 0.1}
								reduceMotion={Boolean(reduceMotion)}
								onEntryComplete={
									!reduceMotion && item.id === lastInitialEntryItemId
										? () => {
												setInitialEntryItemIds(new Set());
												onEntryComplete?.();
											}
										: undefined
								}
								onRefreshLinkMetadata={onRefreshLinkMetadata}
								onLinkImageSelect={onLinkImageSelect}
							/>
						);

						return (
							<div key={item.id}>
								{mode === "view" && item.type === "map" ? (
									<MapViewportGate
										placeholder={
											<div
												aria-hidden="true"
												className="size-full bg-secondary"
												style={{ borderRadius: itemRadius }}
											/>
										}
									>
										{itemShell}
									</MapViewportGate>
								) : (
									itemShell
								)}
							</div>
						);
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
