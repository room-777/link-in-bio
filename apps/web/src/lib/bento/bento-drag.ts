import type { BentoLayoutMap } from "@grabbin/bento-layout";

type GridPosition = {
	i: string;
	x: number;
	y: number;
	w: number;
	h: number;
};

export function toBentoLayoutMap(
	layout: readonly GridPosition[],
): BentoLayoutMap {
	return Object.fromEntries(
		layout.map(({ i, x, y, w, h }) => [i, { x, y, w, h }]),
	) as BentoLayoutMap;
}

function isOutsideBentoGrid(layout: BentoLayoutMap, columns: number) {
	return Object.values(layout).some(
		(item) => item.x < 0 || item.y < 0 || item.x + item.w > columns,
	);
}

export function resolveBentoDragLayout(input: {
	nextLayout: readonly GridPosition[];
	startLayout: BentoLayoutMap;
	columns: number;
}) {
	const nextLayout = toBentoLayoutMap(input.nextLayout);
	const outsideGrid = isOutsideBentoGrid(nextLayout, input.columns);
	return {
		layout: outsideGrid ? input.startLayout : nextLayout,
		outsideGrid,
	};
}
