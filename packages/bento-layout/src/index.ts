import type { ItemLayout, ItemType } from "@grabbin/api";

export const bentoColumnCounts = {
	wide: 4,
	compact: 2,
} as const;

export type BentoBreakpoint = keyof typeof bentoColumnCounts;

// Same 1260px boundary as the page-wide CSS breakpoint (78.75rem).
export const bentoWideMediaQuery = "(min-width: 78.75rem)";
export type PresetName =
	| "fullBanner"
	| "halfBanner"
	| "squareSmall"
	| "landscape"
	| "squareLarge"
	| "portrait";

const bentoItemRadius = {
	default: 24,
	section: 20,
	halfBanner: 20,
	squareLarge: 28,
} as const;

export function getBentoItemRadius(
	type: ItemType,
	preset: PresetName | null,
): number {
	if (type === "section") return bentoItemRadius.section;
	if (preset === "halfBanner") return bentoItemRadius.halfBanner;
	if (preset === "squareLarge") return bentoItemRadius.squareLarge;
	return bentoItemRadius.default;
}

export type BentoLayoutItem = {
	id: string;
	layout: ItemLayout;
};

export type BentoLayoutMap = Record<string, ItemLayout>;

export const bentoGridMetrics: Record<
	BentoBreakpoint,
	{ margin: [number, number]; rowHeight: number }
> = {
	wide: { margin: [40, 40], rowHeight: 69 },
	compact: { margin: [24, 24], rowHeight: 77 },
};
export const bentoContainerPadding: [number, number] = [0, 0];

export function getBentoWidth(breakpoint: BentoBreakpoint): number {
	const { margin, rowHeight } = bentoGridMetrics[breakpoint];
	const cols = getColumns(breakpoint);
	// Keep the small square at 178px with either gap.
	const squareBentoSize = rowHeight * 2 + margin[1];
	return squareBentoSize * cols + margin[0] * (cols - 1);
}

export function getBentoGridHeight(
	layouts: readonly ItemLayout[],
	breakpoint: BentoBreakpoint,
): number {
	const rows = layouts.reduce(
		(bottom, layout) => Math.max(bottom, layout.y + layout.h),
		0,
	);
	const { margin, rowHeight } = bentoGridMetrics[breakpoint];
	return rows * rowHeight + Math.max(0, rows - 1) * margin[1];
}

const allowedPresets: Record<ItemType, readonly PresetName[]> = {
	section: ["fullBanner"],
	media: ["squareSmall", "landscape", "portrait", "squareLarge"],
	map: ["squareSmall", "landscape", "portrait", "squareLarge"],
	link: ["squareSmall", "halfBanner", "landscape", "portrait", "squareLarge"],
	calendly: [
		"squareSmall",
		"halfBanner",
		"landscape",
		"portrait",
		"squareLarge",
	],
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
			const candidate = { x, y, w: itemSize.w, h: itemSize.h };
			if (isLegal(candidate, layouts, cols)) return candidate;
		}
	}
}

export function compactWithGravity(
	layouts: BentoLayoutMap,
	cols: number,
	protectedId?: string,
): BentoLayoutMap {
	const result = Object.fromEntries(
		Object.entries(layouts).map(([id, layout]) => [id, { ...layout }]),
	) as BentoLayoutMap;
	const orderedIds = Object.keys(result).sort((a, b) => {
		const first = result[a];
		const second = result[b];
		if (!first || !second) return a.localeCompare(b);
		return first.y - second.y || first.x - second.x || a.localeCompare(b);
	});

	for (const id of orderedIds) {
		const current = result[id];
		if (!current) continue;
		if (id === protectedId) continue;
		const others = Object.fromEntries(
			Object.entries(result).filter(([otherId]) => otherId !== id),
		) as BentoLayoutMap;
		let next = { ...current };
		while (next.y > 0) {
			const candidate = { ...next, y: next.y - 1 };
			if (!isLegal(candidate, others, cols)) break;
			next = candidate;
		}
		result[id] = next;
	}

	if (!validateBentoLayout(result, cols)) {
		throw new Error("Unable to compact the Bento layout.");
	}
	return result;
}

function pushCollisionsDown(
	layouts: BentoLayoutMap,
	protectedId: string,
): BentoLayoutMap {
	// ponytail: O(n²) is enough for small Bento layouts; use spatial indexing if that changes.
	const result = Object.fromEntries(
		Object.entries(layouts).map(([id, layout]) => [id, { ...layout }]),
	) as BentoLayoutMap;
	const protectedLayout = result[protectedId];
	if (!protectedLayout) return result;

	const pending = [protectedId];
	while (pending.length > 0) {
		const id = pending.shift();
		if (!id) continue;
		const current = result[id];
		if (!current) continue;
		const collision = Object.entries(result).find(
			([otherId, other]) => otherId !== id && overlaps(current, other),
		);
		if (!collision) continue;

		const [collisionId, collisionLayout] = collision;
		if (collisionId === protectedId) {
			result[id] = { ...current, y: current.y + 1 };
			pending.unshift(id);
			continue;
		}
		result[collisionId] = {
			...collisionLayout,
			y: collisionLayout.y + 1,
		};
		pending.push(id, collisionId);
	}
	return result;
}

export function applyPresetToLayoutMap({
	layouts,
	itemId,
	itemType,
	preset,
	breakpoint,
}: {
	layouts: BentoLayoutMap;
	itemId: string;
	itemType: ItemType;
	preset: PresetName;
	breakpoint: BentoBreakpoint;
}): BentoLayoutMap {
	const current = layouts[itemId];
	if (!current) throw new Error(`Unknown item ${itemId}.`);
	if (!allowedPresets[itemType].includes(preset)) {
		throw new Error(`${preset} is not allowed for ${itemType}.`);
	}

	const cols = getColumns(breakpoint);
	const nextSize = getPresetGeometry(preset, breakpoint);
	const distanceToLeft = current.x;
	const distanceToRight = cols - (current.x + current.w);
	const nextX =
		distanceToRight < distanceToLeft
			? current.x + current.w - nextSize.w
			: current.x;
	const candidate = {
		...nextSize,
		x: Math.min(Math.max(nextX, 0), cols - nextSize.w),
		y: current.y,
	};

	const others = Object.fromEntries(
		Object.entries(layouts).filter(([id]) => id !== itemId),
	) as BentoLayoutMap;
	return compactWithGravity(
		pushCollisionsDown({ ...others, [itemId]: candidate }, itemId),
		cols,
		itemId,
	);
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
