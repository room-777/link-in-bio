"use client";

import {
	bentoColumnCounts,
	bentoGridMetrics,
	getBentoWidth,
} from "@grabbin/bento-layout";
import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import type { BentoItem } from "@/lib/bento/bento-types";
import { BentoItemShell } from "../bento/bento-item-shell";

function getLayoutSize(item: BentoItem) {
	const { margin, rowHeight } = bentoGridMetrics.wide;
	const layout = item.layouts.wide;
	const columnWidth =
		(getBentoWidth("wide") - margin[0] * (bentoColumnCounts.wide - 1)) /
		bentoColumnCounts.wide;

	return {
		width: columnWidth * layout.w + margin[0] * (layout.w - 1),
		height: rowHeight * layout.h + margin[1] * (layout.h - 1),
	};
}

export function AdvancedWidgetPreviewFrame({
	item,
	children,
}: {
	item: BentoItem;
	children: ReactNode;
}) {
	const previewAreaRef = useRef<HTMLDivElement>(null);
	const layoutSize = getLayoutSize(item);
	const [previewSize, setPreviewSize] = useState(layoutSize);

	useEffect(() => {
		const previewArea = previewAreaRef.current;
		if (!previewArea) return;

		const resizeObserver = new ResizeObserver(([entry]) => {
			const scale = Math.min(
				entry.contentRect.width / layoutSize.width,
				entry.contentRect.height / layoutSize.height,
				1,
			);
			setPreviewSize({
				width: layoutSize.width * scale,
				height: layoutSize.height * scale,
			});
		});
		resizeObserver.observe(previewArea);
		return () => resizeObserver.disconnect();
	}, [layoutSize.height, layoutSize.width]);

	return (
		<div
			ref={previewAreaRef}
			className="flex h-[55%] min-h-0 shrink-0 justify-center rounded-2xl bg-secondary/60 py-6 outline-depth"
		>
			<div
				aria-hidden="true"
				inert
				className="self-center"
				style={{ width: previewSize.width, height: previewSize.height }}
			>
				<BentoItemShell
					item={item}
					breakpoint="wide"
					mode="view"
					autoFocus={false}
					disableCardLink
				>
					{children}
				</BentoItemShell>
			</div>
		</div>
	);
}
