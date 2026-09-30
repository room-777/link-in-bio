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

const previewImage = `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800"><defs><linearGradient id="sky" x2="0" y2="1"><stop stop-color="#9bd7fa"/><stop offset="1" stop-color="#fff0c4"/></linearGradient></defs><rect width="1200" height="800" fill="url(#sky)"/><circle cx="930" cy="180" r="86" fill="#fff7cf"/><path d="M0 470 240 260l250 250 220-300 490 270v320H0z" fill="#9aa9b5"/><path d="m0 560 310-160 240 170 290-220 360 160v290H0z" fill="#697e67"/><path d="M0 690c210-95 380-100 590-8 220 96 410 79 610-30v148H0z" fill="#344e40"/></svg>`)}`;
const instagramIcon = `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><defs><linearGradient id="g" x1="0" y1="1" x2="1" y2="0"><stop stop-color="#ffb442"/><stop offset=".5" stop-color="#e1306c"/><stop offset="1" stop-color="#7656c8"/></linearGradient></defs><rect width="64" height="64" rx="16" fill="url(#g)"/><rect x="14" y="14" width="36" height="36" rx="11" fill="none" stroke="white" stroke-width="4"/><circle cx="32" cy="32" r="9" fill="none" stroke="white" stroke-width="4"/><circle cx="44" cy="20" r="2.5" fill="white"/></svg>`)}`;

function getPreviewItem(type: BlockType): BentoItem {
	const source = DEMO_PAGE_RESPONSE.items.find((item) => item.type === type);
	if (!source) throw new Error(`Missing demo item for ${type}.`);
	const item = structuredClone(source) as BentoItem;
	item.preset = inferPresetFromLayout(item.type, item.layouts.wide, "wide");
	if (item.type === "link" && item.data.metadata?.presentation) {
		item.data.metadata = {
			...item.data.metadata,
			faviconUrl: instagramIcon,
			imageUrl: previewImage,
			presentation: {
				...item.data.metadata.presentation,
				imageUrls: [previewImage],
			},
		};
	}
	if (item.type === "media") {
		item.data.mediaUrl = previewImage;
	}
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
							item.type === "section" ? "smooth-shadow-ring-sm!" : undefined
						}
						isAnyItemDragging={false}
						disableNetworkRequests
					/>
				</div>
			</motion.div>
		</div>
	);
}

export default function UpdateBlockPreview({ type }: { type: BlockType }) {
	return <ItemPreview key={type} type={type} />;
}
