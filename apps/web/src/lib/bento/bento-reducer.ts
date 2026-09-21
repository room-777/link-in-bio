import {
	getAllowedPresets,
	getColumns,
	getPresetGeometry,
	placeAtFirstAvailable,
	validateBentoLayout,
} from "@grabbin/bento-layout";

import { createBentoItem } from "./bento-factory";
import type { BentoCommand, BentoItem } from "./bento-types";

export type BentoReductionResult = {
	items: BentoItem[];
	addedItem?: BentoItem;
};

export function reduceBentoItems(
	items: readonly BentoItem[],
	command: BentoCommand,
): BentoReductionResult | undefined {
	if (command.type === "add-item") {
		const addedItem = createBentoItem({
			items,
			itemType: command.itemType,
			url: command.url,
		});
		return { items: [...items, addedItem], addedItem };
	}

	if (command.type === "replace-layout") {
		if (!validateBentoLayout(command.layout, getColumns(command.breakpoint))) {
			return undefined;
		}
		return {
			items: items.map((item) => {
				const layout = command.layout[item.id];
				return layout
					? {
							...item,
							layouts: { ...item.layouts, [command.breakpoint]: layout },
						}
					: item;
			}),
		};
	}

	const target = items.find((item) => item.id === command.itemId);
	if (!target) return undefined;

	if (command.type === "update-data") {
		return {
			items: items.map((item) =>
				item.id === command.itemId
					? ({
							...item,
							data: structuredClone(command.data) as typeof item.data,
						} as BentoItem)
					: item,
			),
		};
	}

	if (command.type === "update-style") {
		return {
			items: items.map((item) =>
				item.id === command.itemId
					? { ...item, style: { ...item.style, ...command.patch } }
					: item,
			),
		};
	}

	if (command.type === "delete-item") {
		return { items: items.filter((item) => item.id !== command.itemId) };
	}

	if (!getAllowedPresets(target.type).includes(command.preset)) {
		return undefined;
	}

	const columns = getColumns(command.breakpoint);
	const otherLayouts = Object.fromEntries(
		items
			.filter((item) => item.id !== target.id)
			.map((item) => [item.id, item.layouts[command.breakpoint]]),
	);
	const geometry = getPresetGeometry(command.preset, command.breakpoint);
	const currentLayout = target.layouts[command.breakpoint];
	const positionedLayout = {
		...geometry,
		x: currentLayout.x,
		y: currentLayout.y,
	};
	const nextLayout = validateBentoLayout(
		{ ...otherLayouts, [target.id]: positionedLayout },
		columns,
	)
		? positionedLayout
		: placeAtFirstAvailable(otherLayouts, geometry, columns);

	return {
		items: items.map((item) =>
			item.id === target.id
				? {
						...item,
						preset: command.preset,
						layouts: {
							...item.layouts,
							[command.breakpoint]: nextLayout,
						},
					}
				: item,
		),
	};
}
