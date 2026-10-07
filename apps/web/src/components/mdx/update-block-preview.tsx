"use client";

import {
	getPresetGeometry,
	inferPresetFromLayout,
	type PresetName,
} from "@grabbin/bento-layout";
import { motion } from "motion/react";
import { useState } from "react";
import { BentoItemShell } from "@/components/page/editor/bento/bento-item-shell";
import type { BentoCommand, BentoItem } from "@/lib/bento/bento-types";
import { DEMO_PAGE_RESPONSE } from "@/lib/demo-page";

type BlockType = "link" | "media" | "map" | "text" | "section";

function getPreviewItem(type: BlockType): BentoItem {
	const source = DEMO_PAGE_RESPONSE.items.find((item) => item.type === type);
	if (!source) throw new Error(`Missing demo item for ${type}.`);
	const item = structuredClone(source) as BentoItem;
	item.preset = inferPresetFromLayout(item.type, item.layouts.wide, "wide");
	return item;
}

function getPreviewSize(item: BentoItem) {
	const preset = inferPresetFromLayout(item.type, item.layouts.wide, "wide");
	if (!preset) return { width: 380, height: 172 };
	const layout = getPresetGeometry(preset as PresetName, "wide");
	return {
		width: item.type === "section" ? 380 : layout.w * 172 + (layout.w - 1) * 36,
		height: layout.h * 68 + (layout.h - 1) * 36,
	};
}

function applyPreviewCommand(
	item: BentoItem,
	command: BentoCommand,
): BentoItem {
	if (command.type === "apply-preset" && command.itemId === item.id) {
		return {
			...item,
			layouts: {
				...item.layouts,
				[command.breakpoint]: getPresetGeometry(
					command.preset,
					command.breakpoint,
				),
			},
			preset: command.preset,
		};
	}
	if (command.type === "update-data" && command.itemId === item.id) {
		return { ...item, data: command.data } as BentoItem;
	}
	if (command.type === "update-style" && command.itemId === item.id) {
		return { ...item, style: { ...item.style, ...command.patch } } as BentoItem;
	}
	return item;
}

function ItemPreview({ type }: { type: BlockType }) {
	const [item, setItem] = useState(() => getPreviewItem(type));
	const size = getPreviewSize(item);
	const handleCommand = (command: BentoCommand) => {
		if (command.type === "delete-item") return;
		setItem((current) => applyPreviewCommand(current, command));
	};
	const handleLinkImageSelect = (itemId: string, file: File) => {
		if (item.type !== "link" || itemId !== item.id) return;
		const imageUrl = URL.createObjectURL(file);
		setItem((current) => {
			if (current.type !== "link") return current;
			const metadata = current.data.metadata;
			return {
				...current,
				data: {
					...current.data,
					metadata: metadata
						? {
								...metadata,
								imageUrl,
								presentation: metadata.presentation
									? { ...metadata.presentation, imageUrls: [imageUrl] }
									: undefined,
							}
						: metadata,
				},
			};
		});
	};
	return (
		<div
			className="smooth-shadow-ring-xs my-6 flex aspect-video min-h-[428px] w-full items-center justify-center rounded-md bg-secondary/10 p-4 [&_[data-bento-item-delete-control=true]]:hidden"
			onClickCapture={(event) => {
				if (event.target instanceof Element && event.target.closest("a")) {
					event.preventDefault();
				}
			}}
		>
			<motion.div
				className="bento-layout mdx-bento-item-preview relative max-w-full shrink-0"
				animate={{ width: size.width, height: size.height }}
				transition={{ duration: 0.32, ease: [0.34, 1.25, 0.64, 1] }}
			>
				<div className="react-grid-item relative size-full">
					<BentoItemShell
						item={item}
						breakpoint="wide"
						mode="edit"
						autoFocus={false}
						onCommand={handleCommand}
						onLinkImageSelect={handleLinkImageSelect}
						cardClassName={
							item.type === "text"
								? "[&_textarea]:text-black"
								: item.type === "section"
									? "smooth-shadow-ring-sm! [&_input]:text-black"
									: undefined
						}
						isAnyItemDragging={false}
						disableLocationSearch
					/>
				</div>
			</motion.div>
		</div>
	);
}

export default function UpdateBlockPreview({ type }: { type: BlockType }) {
	return <ItemPreview key={type} type={type} />;
}
