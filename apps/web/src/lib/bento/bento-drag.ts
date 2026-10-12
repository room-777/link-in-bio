import {
	type BentoLayoutMap,
	validateBentoLayout,
} from "@grabbin/bento-layout";
import { moveElement } from "react-grid-layout";
import { fastVerticalCompactor } from "react-grid-layout/extras";

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
	activeItemId?: string;
	position?: { x: number; y: number };
}) {
	let nextLayout = toBentoLayoutMap(input.nextLayout);
	if (input.activeItemId && input.position) {
		const rglLayout = Object.entries(input.startLayout).map(([i, item]) => ({
			i,
			...item,
		}));
		const activeItem = rglLayout.find((item) => item.i === input.activeItemId);
		if (activeItem) {
			const movedLayout = moveElement(
				rglLayout,
				activeItem,
				input.position.x,
				input.position.y,
				true,
				false,
				"vertical",
				input.columns,
				false,
			);
			nextLayout = toBentoLayoutMap(
				fastVerticalCompactor.compact(movedLayout, input.columns),
			);
		}
	}
	const outsideGrid = isOutsideBentoGrid(nextLayout, input.columns);
	if (outsideGrid || !validateBentoLayout(nextLayout, input.columns)) {
		return { layout: input.startLayout, outsideGrid };
	}
	return { layout: nextLayout, outsideGrid };
}
