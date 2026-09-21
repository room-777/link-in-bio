import type { ItemLayout, ItemType } from "@grabbin/api";

export const gridColumnCounts = {
	wide: 4,
	compact: 2,
} as const;

export type GridBreakpoint = keyof typeof gridColumnCounts;
export type PresetName =
	| "fullBanner"
	| "halfBanner"
	| "squareSmall"
	| "landscape"
	| "squareLarge"
	| "portrait";

export type GridLayoutItem = {
	id: string;
	layout: ItemLayout;
};

export const gridMargin: [number, number] = [36, 36];
export const gridRowHeight = 68;
export const gridContainerPadding: [number, number] = [0, 0];

const squareGridSize = gridRowHeight * 2 + gridMargin[1];

export function getGridWidth(cols: number): number {
	return squareGridSize * cols + gridMargin[0] * (cols - 1);
}

const allowedPresets: Record<ItemType, readonly PresetName[]> = {
	section: ["fullBanner"],
	media: ["squareSmall", "landscape", "portrait", "squareLarge"],
	map: ["squareSmall", "landscape", "portrait", "squareLarge"],
	link: ["squareSmall", "halfBanner", "landscape", "portrait", "squareLarge"],
	text: ["squareSmall", "halfBanner", "landscape", "portrait", "squareLarge"],
};

const presetGeometry: Record<PresetName, ItemLayout> = {
	fullBanner: { x: 0, y: 0, w: 4, h: 1 },
	halfBanner: { x: 0, y: 0, w: 2, h: 1 },
	squareSmall: { x: 0, y: 0, w: 1, h: 2 },
	landscape: { x: 0, y: 0, w: 2, h: 2 },
	squareLarge: { x: 0, y: 0, w: 2, h: 4 },
	portrait: { x: 0, y: 0, w: 1, h: 4 },
};

export function getAllowedPresets(type: ItemType): PresetName[] {
	return [...allowedPresets[type]];
}

export function getPresetGeometry(
	preset: PresetName,
	breakpoint: GridBreakpoint,
): ItemLayout {
	const geometry = presetGeometry[preset];
	return preset === "fullBanner" && breakpoint === "compact"
		? { ...geometry, w: 2 }
		: { ...geometry };
}

export function inferPresetFromLayout(
	type: ItemType,
	layout: ItemLayout,
	breakpoint: GridBreakpoint,
): PresetName | null {
	return (
		getAllowedPresets(type).find((preset) => {
			const geometry = getPresetGeometry(preset, breakpoint);
			return layout.w === geometry.w && layout.h === geometry.h;
		}) ?? null
	);
}

export function getColumns(breakpoint: GridBreakpoint): number {
	return gridColumnCounts[breakpoint];
}

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
