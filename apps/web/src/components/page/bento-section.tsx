"use client";

import {
	bentoContainerPadding,
	bentoMargin,
	bentoRowHeight,
	getBentoWidth,
	getColumns,
	validateBentoLayout,
} from "@grabbin/bento-layout";
import { useCallback } from "react";
import ReactGridLayout, {
	type EventCallback,
	useContainerWidth,
} from "react-grid-layout";
import { fastVerticalCompactor } from "react-grid-layout/extras";
import type {
	BentoCommand,
	BentoItem as BentoItemData,
} from "@/lib/bento/bento-types";
import { BentoItemShell } from "./bento/bento-item-shell";

type BentoSectionProps = {
	items: readonly BentoItemData[];
	mode?: "view" | "edit";
	breakpoint?: "wide" | "compact";
	autoFocusItemId?: string | null;
	onAutoFocus?: (itemId: string) => void;
	onCommand?: (command: BentoCommand) => void;
};

const WIDE_CONTAINER_MIN_WIDTH = getBentoWidth(getColumns("wide"));

export default function BentoSection({
	items,
	mode = "view",
	breakpoint: requestedBreakpoint,
	autoFocusItemId = null,
	onAutoFocus,
	onCommand,
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
	const layout = items.map((item) => ({
		i: item.id,
		...item.layouts[breakpoint],
		isResizable: false,
		resizeHandles: [],
	}));
	const handleDragStop: EventCallback = useCallback(
		(nextLayout) => {
			const nextMap = Object.fromEntries(
				nextLayout.map(({ i, x, y, w, h }) => [i, { x, y, w, h }]),
			);
			if (onCommand && validateBentoLayout(nextMap, cols)) {
				onCommand({
					type: "replace-layout",
					breakpoint,
					layout: nextMap,
				});
			}
		},
		[breakpoint, cols, onCommand],
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
					key={breakpoint}
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
							/>
						</div>
					))}
				</ReactGridLayout>
			) : null}
		</section>
	);
}
