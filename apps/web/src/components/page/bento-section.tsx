"use client";

import type { BentoBreakpoint } from "@grabbin/bento-layout";
import {
	bentoContainerPadding,
	bentoMargin,
	bentoRowHeight,
	getBentoWidth,
	getColumns,
	validateBentoLayout,
} from "@grabbin/bento-layout";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { BentoItemShell } from "./bento/bento-item-shell";

type BentoSectionProps = {
	items: readonly BentoItemData[];
	mode?: "view" | "edit";
	breakpoint?: BentoBreakpoint;
	autoFocusItemId?: string | null;
	onAutoFocus?: (itemId: string) => void;
	onCommand?: (command: BentoCommand) => void;
	onRefreshLinkMetadata?: (itemId: string) => Promise<void>;
};

const WIDE_CONTAINER_MIN_WIDTH = getBentoWidth(getColumns("wide"));
const BENTO_ITEM_EXIT_DURATION = 180;

export default function BentoSection({
	items,
	mode = "view",
	breakpoint: requestedBreakpoint,
	autoFocusItemId = null,
	onAutoFocus,
	onCommand,
	onRefreshLinkMetadata,
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
	const breakpoint = requestedBreakpoint ?? measuredBreakpoint;
	const cols = getColumns(breakpoint);
	const bentoWidth = getBentoWidth(cols);
	const bottomPaddingClass =
		mode === "edit"
			? breakpoint === "wide"
				? "pb-80"
				: "pb-64"
			: breakpoint === "compact"
				? "pb-64"
				: "";
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
	const [exitingItems, setExitingItems] = useState<
		ReadonlyMap<string, BentoItemData>
	>(new Map());
	const [layoutRevision, setLayoutRevision] = useState(0);
	const [draggingItemId, setDraggingItemId] = useState<string | null>(null);
	const dragMotion = useBentoDragMotion();
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

	return (
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
					style={{ width: bentoWidth }}
					layout={layout}
					width={bentoWidth}
					gridConfig={{
						cols,
						rowHeight: bentoRowHeight,
						margin: bentoMargin,
						containerPadding: bentoContainerPadding,
					}}
					dragConfig={{
						enabled: mode === "edit",
						bounded: false,
						cancel:
							"input, textarea, button, a, [data-bento-item-drag-cancel='true']",
					}}
					resizeConfig={{ enabled: false }}
					autoSize
					compactor={fastVerticalCompactor}
					onDragStart={mode === "edit" ? handleDragStart : undefined}
					onDrag={mode === "edit" ? handleDrag : undefined}
					onDragStop={mode === "edit" ? handleDragStop : undefined}
				>
					{displayItems.map((item) => (
						<div key={item.id}>
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
								onRefreshLinkMetadata={onRefreshLinkMetadata}
							/>
						</div>
					))}
				</ReactGridLayout>
			) : null}
		</section>
	);
}
