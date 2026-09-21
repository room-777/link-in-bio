"use client";

import type { PageItemResponse } from "@grabbin/api";
import {
	getColumns,
	getGridWidth,
	gridContainerPadding,
	gridMargin,
	gridRowHeight,
	inferPresetFromLayout,
} from "@grabbin/grid-layout";
import type { CSSProperties } from "react";
import GridLayout, { useContainerWidth } from "react-grid-layout";
import { fastVerticalCompactor } from "react-grid-layout/extras";
import { RuntimeFallback, renderItem } from "./page-grid-content";

type PageGridProps = {
	items: readonly PageItemResponse[];
};

const WIDE_CONTAINER_MIN_WIDTH = getGridWidth(getColumns("wide"));

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

function PageGridItem({
	item,
	breakpoint,
}: {
	item: PageItemResponse;
	breakpoint: "wide" | "compact";
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
			data-grid-item-shell="true"
			data-grid-item-id={item.id}
			data-grid-item-type={item.type}
			data-grid-item-preset={preset ?? "unsupported"}
			className="group/grid-item grid-item-pop-in relative size-full overflow-visible rounded-2xl transition-[z-index] focus-within:z-50 hover:z-50"
		>
			<div
				data-grid-item-card="true"
				className={`grid-item-card smooth-shadow-ring-sm relative size-full overflow-hidden rounded-2xl bg-background ${item.type === "map" ? "map-item-interaction" : ""} ${linkTheme ? "link-card-themed" : ""}`}
				style={cardStyle}
			>
				<div className="relative z-10 size-full min-h-0 rounded-[inherit]">
					{preset ? renderItem(item, preset) : <RuntimeFallback item={item} />}
				</div>
			</div>
		</div>
	);
}

export default function PageGrid({ items }: PageGridProps) {
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
	const gridWidth = getGridWidth(cols);
	const bottomPaddingClass = breakpoint === "compact" ? "pb-64" : "";
	const layout = items.map((item) => ({
		i: item.id,
		...item.layouts[breakpoint],
		isResizable: false,
		resizeHandles: [],
	}));

	return (
		<section
			ref={containerRef}
			className={`grid-section-shell flex min-w-full max-w-full shrink-0 justify-center overflow-visible ${bottomPaddingClass}`}
			style={mounted ? { width: gridWidth } : undefined}
			aria-label="Page content"
		>
			{mounted ? (
				<GridLayout
					key={breakpoint}
					className="sinabro-grid-layout max-w-full overflow-visible"
					style={{ width: gridWidth }}
					layout={layout}
					width={gridWidth}
					gridConfig={{
						cols,
						rowHeight: gridRowHeight,
						margin: gridMargin,
						containerPadding: gridContainerPadding,
					}}
					dragConfig={{ enabled: false }}
					resizeConfig={{ enabled: false }}
					autoSize
					compactor={fastVerticalCompactor}
				>
					{items.map((item) => (
						<div key={item.id}>
							<PageGridItem item={item} breakpoint={breakpoint} />
						</div>
					))}
				</GridLayout>
			) : null}
		</section>
	);
}
