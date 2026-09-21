"use client";

import {
	bentoContainerPadding,
	bentoMargin,
	bentoRowHeight,
	getBentoWidth,
	getColumns,
	inferPresetFromLayout,
	validateBentoLayout,
} from "@grabbin/bento-layout";
import { Button } from "@grabbin/ui/components/button";
import { Trash2 } from "lucide-react";
import type { CSSProperties } from "react";
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
import { RuntimeFallback, renderItem } from "./bento-content";
import BentoItemControls from "./bento-item-controls";

type BentoSectionProps = {
	items: readonly BentoItemData[];
	mode?: "view" | "edit";
	autoFocusItemId?: string | null;
	onAutoFocus?: (itemId: string) => void;
	onCommand?: (command: BentoCommand) => void;
};

const WIDE_CONTAINER_MIN_WIDTH = getBentoWidth(getColumns("wide"));

function getBackgroundColor(value: string | undefined) {
	if (!value) return undefined;
	if (value.startsWith("#")) return value;
	if (value === "bg-transparent") return "transparent";
	if (value === "bg-current") return "currentColor";
	if (value === "bg-inherit") return "inherit";

	const token = value.slice(3);
	const [name, opacity] = token.split("/");
	const semanticTokens = new Set([
		"accent",
		"background",
		"destructive",
		"foreground",
		"input",
		"muted",
		"primary",
		"ring",
		"secondary",
	]);
	const cssVariable = semanticTokens.has(name)
		? `--${name}`
		: `--color-${name}`;

	return opacity
		? `color-mix(in oklch, var(${cssVariable}) ${opacity}%, transparent)`
		: `var(${cssVariable})`;
}

function BentoItemShell({
	item,
	breakpoint,
	mode,
	autoFocus,
	onAutoFocus,
	onCommand,
}: {
	item: BentoItemData;
	breakpoint: "wide" | "compact";
	mode: "view" | "edit";
	autoFocus: boolean;
	onAutoFocus?: () => void;
	onCommand?: (command: BentoCommand) => void;
}) {
	const preset = inferPresetFromLayout(
		item.type,
		item.layouts[breakpoint],
		breakpoint,
	);
	const linkPresentation =
		item.type === "link" ? item.data.metadata?.presentation : undefined;
	const linkTheme = linkPresentation?.cardBackground
		? linkPresentation
		: undefined;
	const cardStyle: CSSProperties = {
		backgroundColor:
			getBackgroundColor(item.style.backgroundColor) ??
			linkTheme?.cardBackground,
	};
	return (
		<div
			data-bento-item-shell="true"
			data-bento-item-id={item.id}
			data-bento-item-type={item.type}
			data-bento-item-preset={preset ?? "unsupported"}
			className="group/bento-item bento-item-pop-in relative size-full overflow-visible rounded-2xl transition-[z-index] focus-within:z-50 hover:z-50"
		>
			<div
				data-bento-item-card="true"
				className={`bento-item-card smooth-shadow-ring-sm relative size-full overflow-hidden rounded-2xl bg-background ${item.type === "map" ? "map-item-interaction" : ""} ${linkTheme ? "link-card-themed" : ""}`}
				style={cardStyle}
			>
				<div className="relative z-10 size-full min-h-0 rounded-[inherit]">
					{preset ? (
						renderItem(item, preset, {
							mode,
							autoFocus,
							onAutoFocus,
							onCommand,
						})
					) : (
						<RuntimeFallback item={item} />
					)}
				</div>
			</div>
			{mode === "edit" && onCommand ? (
				<>
					<Button
						type="button"
						variant="default"
						size="icon-sm"
						aria-label="Delete item"
						title="Delete item"
						data-bento-item-delete-control="true"
						onClick={() => onCommand({ type: "delete-item", itemId: item.id })}
						className="absolute -top-4 -right-4 z-20 size-10 rounded-lg p-1 opacity-0 shadow-xs transition-[opacity,transform,scale] duration-150 focus-visible:scale-100 focus-visible:opacity-100 group-hover/bento-item:scale-100 group-hover/bento-item:opacity-100 motion-reduce:transition-none"
					>
						<Trash2 className="size-5 stroke-[2.5px]" />
					</Button>
					<BentoItemControls
						item={item}
						breakpoint={breakpoint}
						onCommand={onCommand}
					/>
				</>
			) : null}
		</div>
	);
}

export default function BentoSection({
	items,
	mode = "view",
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

	const breakpoint =
		mounted && containerWidth >= WIDE_CONTAINER_MIN_WIDTH ? "wide" : "compact";
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
