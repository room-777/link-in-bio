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
import { useCallback, useMemo, useRef, useState } from "react";
import ReactGridLayout, {
	type EventCallback,
	useContainerWidth,
} from "react-grid-layout";
import { fastVerticalCompactor } from "react-grid-layout/extras";
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
	isItemUploading?: (itemId: string) => boolean;
	onRefreshLinkMetadata?: (itemId: string) => Promise<void>;
};

const WIDE_CONTAINER_MIN_WIDTH = getBentoWidth(getColumns("wide"));

export default function BentoSection({
	items,
	mode = "view",
	breakpoint: requestedBreakpoint,
	autoFocusItemId = null,
	onAutoFocus,
	onCommand,
	isItemUploading,
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
	const breakpoint =
		mode === "edit"
			? (requestedBreakpoint ?? measuredBreakpoint)
			: measuredBreakpoint;
	const cols = getColumns(breakpoint);
	const bentoWidth = getBentoWidth(cols);
	const bottomPaddingClass = breakpoint === "compact" ? "pb-64" : "";
	const dragStartLayoutRef = useRef<ReturnType<typeof toBentoLayoutMap> | null>(
		null,
	);
	const [layoutRevision, setLayoutRevision] = useState(0);
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
	const handleDragStart: EventCallback = useCallback((currentLayout) => {
		dragStartLayoutRef.current = toBentoLayoutMap(currentLayout);
	}, []);
	const handleDragStop: EventCallback = useCallback(
		(nextLayout) => {
			const resolved = resolveBentoDragLayout({
				nextLayout,
				startLayout: dragStartLayoutRef.current ?? toBentoLayoutMap(layout),
				columns: cols,
			});
			dragStartLayoutRef.current = null;
			if (resolved.outsideGrid) setLayoutRevision((revision) => revision + 1);
			if (onCommand && validateBentoLayout(resolved.layout, cols)) {
				onCommand({
					type: "replace-layout",
					breakpoint,
					layout: resolved.layout,
				});
			}
		},
		[breakpoint, cols, layout, onCommand],
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
						cancel:
							"input, textarea, button, a, [data-bento-item-drag-cancel='true']",
					}}
					resizeConfig={{ enabled: false }}
					autoSize
					compactor={fastVerticalCompactor}
					onDragStart={mode === "edit" ? handleDragStart : undefined}
					onDragStop={mode === "edit" ? handleDragStop : undefined}
				>
					{items.map((item) => (
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
								onCommand={onCommand}
								isUploading={isItemUploading?.(item.id) ?? false}
								onCancelUpload={() =>
									onCommand?.({ type: "delete-item", itemId: item.id })
								}
								onRefreshLinkMetadata={onRefreshLinkMetadata}
							/>
						</div>
					))}
				</ReactGridLayout>
			) : null}
		</section>
	);
}
