import type { ItemLayout, ItemType } from "@grabbin/api";

export const bentoColumnCounts = {
	wide: 4,
	compact: 2,
} as const;

export type BentoBreakpoint = keyof typeof bentoColumnCounts;
export type PresetName =
	| "fullBanner"
	| "halfBanner"
	| "squareSmall"
	| "landscape"
	| "squareLarge"
	| "portrait";

export type BentoLayoutItem = {
	id: string;
	layout: ItemLayout;
};

export type BentoLayoutMap = Record<string, ItemLayout>;

export const bentoMargin: [number, number] = [36, 36];
export const bentoRowHeight = 68;
export const bentoContainerPadding: [number, number] = [0, 0];

const squareBentoSize = bentoRowHeight * 2 + bentoMargin[1];

export function getBentoWidth(cols: number): number {
	return squareBentoSize * cols + bentoMargin[0] * (cols - 1);
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

export function getDefaultPreset(type: ItemType): PresetName {
	return type === "section" ? "fullBanner" : "squareSmall";
}

export function getPresetGeometry(
	preset: PresetName,
	breakpoint: BentoBreakpoint,
): ItemLayout {
	const geometry = presetGeometry[preset];
	return preset === "fullBanner" && breakpoint === "compact"
		? { ...geometry, w: 2 }
		: { ...geometry };
}

export function inferPresetFromLayout(
	type: ItemType,
	layout: ItemLayout,
	breakpoint: BentoBreakpoint,
): PresetName | null {
	return (
		getAllowedPresets(type).find((preset) => {
			const geometry = getPresetGeometry(preset, breakpoint);
			return layout.w === geometry.w && layout.h === geometry.h;
		}) ?? null
	);
}

export function getColumns(breakpoint: BentoBreakpoint): number {
	return bentoColumnCounts[breakpoint];
}

function isLegal(layout: ItemLayout, existing: BentoLayoutMap, cols: number) {
	if (
		layout.x < 0 ||
		layout.y < 0 ||
		layout.w < 1 ||
		layout.h < 1 ||
		layout.x + layout.w > cols
	) {
		return false;
	}
	return Object.values(existing).every((item) => !overlaps(layout, item));
}

export function placeAtFirstAvailable(
	layouts: BentoLayoutMap,
	itemSize: Pick<ItemLayout, "w" | "h">,
	cols: number,
): ItemLayout {
	if (itemSize.w < 1 || itemSize.h < 1 || itemSize.w > cols) {
		throw new Error("Item size cannot fit within the bento columns.");
	}
	for (let y = 0; ; y += 1) {
		for (let x = 0; x <= cols - itemSize.w; x += 1) {
			const candidate = { x, y, ...itemSize };
			if (isLegal(candidate, layouts, cols)) return candidate;
		}
	}
}

export function validateBentoLayout(layouts: BentoLayoutMap, cols: number) {
	for (const layout of Object.values(layouts)) {
		if (!isLegal(layout, {}, cols)) return false;
	}
	const entries = Object.entries(layouts);
	for (let index = 0; index < entries.length; index += 1) {
		for (
			let nextIndex = index + 1;
			nextIndex < entries.length;
			nextIndex += 1
		) {
			const current = entries[index];
			const next = entries[nextIndex];
			if (current && next && overlaps(current[1], next[1])) return false;
		}
	}
	return true;
}

function overlaps(first: ItemLayout, second: ItemLayout) {
	return (
		first.x < second.x + second.w &&
		second.x < first.x + first.w &&
		first.y < second.y + second.h &&
		second.y < first.y + first.h
	);
}

export function hasValidBentoLayouts(
	items: readonly BentoLayoutItem[],
	breakpoint: BentoBreakpoint,
) {
	const columns = bentoColumnCounts[breakpoint];
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
