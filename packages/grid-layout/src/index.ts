import type { ItemLayout } from "@grabbin/api";

export const gridColumnCounts = {
	wide: 4,
	compact: 2,
} as const;

export type GridBreakpoint = keyof typeof gridColumnCounts;

export type GridLayoutItem = {
	id: string;
	layout: ItemLayout;
};

function overlaps(first: ItemLayout, second: ItemLayout) {
	return (
		first.x < second.x + second.w &&
		second.x < first.x + first.w &&
		first.y < second.y + second.h &&
		second.y < first.y + first.h
	);
}

export function hasValidGridLayouts(
	items: readonly GridLayoutItem[],
	breakpoint: GridBreakpoint,
) {
	const columns = gridColumnCounts[breakpoint];
	for (const item of items) {
		const { x, y, w, h } = item.layout;
		if (x < 0 || y < 0 || w < 1 || h < 1 || x + w > columns) {
			return false;
		}
	}

	for (let index = 0; index < items.length; index += 1) {
		for (let nextIndex = index + 1; nextIndex < items.length; nextIndex += 1) {
			const current = items[index];
			const next = items[nextIndex];
			if (current && next && overlaps(current.layout, next.layout)) {
				return false;
			}
		}
	}

	return true;
}
