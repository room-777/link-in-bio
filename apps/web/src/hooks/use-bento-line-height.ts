"use client";

import { useLayoutEffect, useRef, useState } from "react";

/** Fit complete text lines inside the existing viewport without reducing its size. */
export function useBentoLineHeight(paddingBlock = 0) {
	const viewportRef = useRef<HTMLDivElement>(null);
	const [lineHeight, setLineHeight] = useState<string>();

	useLayoutEffect(() => {
		const viewport = viewportRef.current;
		if (!viewport) return;
		const fitLines = (height: number) => {
			const availableHeight = height - paddingBlock;
			const preferredLineHeight = Number.parseFloat(
				getComputedStyle(viewport).lineHeight,
			);
			if (availableHeight <= 0 || !Number.isFinite(preferredLineHeight)) return;
			const lines = Math.max(
				1,
				Math.floor(availableHeight / preferredLineHeight),
			);
			setLineHeight(`${availableHeight / lines}px`);
		};
		fitLines(viewport.clientHeight);
		const observer = new ResizeObserver(([entry]) => {
			if (entry) fitLines(entry.contentRect.height);
		});
		observer.observe(viewport);
		return () => observer.disconnect();
	}, [paddingBlock]);

	return { viewportRef, lineHeight };
}
