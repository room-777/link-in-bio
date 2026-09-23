"use client";

import {
	bentoMargin,
	bentoRowHeight,
	getBentoWidth,
	getPresetGeometry,
	type PresetName,
} from "@grabbin/bento-layout";
import { motion, useReducedMotion } from "motion/react";

import { BentoItemShell } from "@/components/page/bento/bento-item-shell";
import type { BentoItem } from "@/lib/bento/bento-types";

const PREVIEW_TIMESTAMP = "2026-01-01T00:00:00.000Z";
const PREVIEW_GRID_ROWS = 6;
const PREVIEW_GRID_WIDTH = getBentoWidth(4);
const PREVIEW_GRID_HEIGHT =
	bentoRowHeight * PREVIEW_GRID_ROWS + bentoMargin[1] * (PREVIEW_GRID_ROWS - 1);
const PREVIEW_COLUMN_GAP = `${(bentoMargin[0] / PREVIEW_GRID_WIDTH) * 100}%`;
const PREVIEW_ROW_GAP = `${(bentoMargin[1] / PREVIEW_GRID_HEIGHT) * 100}%`;
const githubContributionColors = [
	"#ebedf0",
	"#9be9a8",
	"#40c463",
	"#30a14e",
	"#216e39",
] as const;

const githubContributionGraph = JSON.stringify({
	weeks: Array.from({ length: 12 }, (_, week) => ({
		days: Array.from({ length: 7 }, (_, day) => {
			const level = (week * 3 + day * 2) % githubContributionColors.length;
			return {
				color: githubContributionColors[level],
				count: level,
				level,
			};
		}),
	})),
});

function previewLayouts(preset: PresetName): BentoItem["layouts"] {
	return {
		wide: getPresetGeometry(preset, "wide"),
		compact: getPresetGeometry(preset, "compact"),
	};
}

const previewItems: ReadonlyArray<{
	className: string;
	delay: number;
	item: BentoItem;
}> = [
	{
		className: "col-start-1 row-start-1 col-span-2 row-span-2",
		delay: -1.2,
		item: {
			id: "sign-in-preview-map",
			type: "map",
			style: {},
			data: {
				latitude: 40.7128,
				longitude: -74.006,
				zoom: 10,
				caption: "New York",
			},
			layouts: previewLayouts("landscape"),
			createdAt: PREVIEW_TIMESTAMP,
			updatedAt: PREVIEW_TIMESTAMP,
			preset: "landscape",
		},
	},
	{
		className: "col-start-3 row-start-1 col-span-1 row-span-4",
		delay: -3.6,
		item: {
			id: "sign-in-preview-instagram",
			type: "link",
			style: {},
			data: {
				url: "https://www.instagram.com/example",
				metadata: {
					title: "@framebyjune",
					faviconUrl: "/api/provider-icons/instagram.svg",
					provider: "instagram",
					providerData: {
						followerCount: 687000000,
						followerCountLabel: "687M",
						followerCountApproximate: true,
					},
					presentation: {
						provider: "instagram",
						providerLabel: "Instagram",
						cardBackground: "#fff2f8",
						actionBackground: "#e1306c",
						actionText: "#ffffff",
						actionLabel: "Follow",
						actionDetail: "687M",
						actionVariant: "solid",
						imageUrls: ["/media-widget.png"],
					},
				},
			},
			layouts: previewLayouts("portrait"),
			createdAt: PREVIEW_TIMESTAMP,
			updatedAt: PREVIEW_TIMESTAMP,
			preset: "portrait",
		},
	},
	{
		className: "col-start-1 row-start-5 col-span-2 row-span-2",
		delay: -2.4,
		item: {
			id: "sign-in-preview-github",
			type: "link",
			style: {},
			data: {
				url: "https://github.com/example",
				metadata: {
					title: "northstar-labs",
					faviconUrl: "/api/provider-icons/github.svg",
					provider: "github",
					providerData: {
						followers: 34,
					},
					presentation: {
						provider: "github",
						providerLabel: "GitHub",
						cardBackground: "#ffffff",
						actionBackground: "#f6f8fa",
						actionText: "#000000",
						actionLabel: "Follow",
						actionDetail: "34",
						actionVariant: "outline",
						githubContributionGraph,
					},
				},
			},
			layouts: previewLayouts("landscape"),
			createdAt: PREVIEW_TIMESTAMP,
			updatedAt: PREVIEW_TIMESTAMP,
			preset: "landscape",
		},
	},
	{
		className: "col-start-3 row-start-5 col-span-1 row-span-2",
		delay: -4.8,
		item: {
			id: "sign-in-preview-media",
			type: "media",
			style: {},
			data: {
				objectKey: "sign-in-preview-media",
				mimeType: "image/png",
				mediaUrl: "/media-widget-sunset.png",
			},
			layouts: previewLayouts("squareSmall"),
			createdAt: PREVIEW_TIMESTAMP,
			updatedAt: PREVIEW_TIMESTAMP,
			preset: "squareSmall",
		},
	},
	{
		className: "col-start-1 row-start-3 col-span-1 row-span-2",
		delay: 0,
		item: {
			id: "sign-in-preview-text",
			type: "text",
			style: {},
			data: { text: "Everything in one place." },
			layouts: previewLayouts("squareSmall"),
			createdAt: PREVIEW_TIMESTAMP,
			updatedAt: PREVIEW_TIMESTAMP,
			preset: "squareSmall",
		},
	},
	{
		className: "col-start-2 row-start-3 col-span-1 row-span-2",
		delay: -5.8,
		item: {
			id: "sign-in-preview-twitter",
			type: "link",
			style: {},
			data: {
				url: "https://x.com/cityframes",
				metadata: {
					title: "@cityframes",
					faviconUrl: "/api/provider-icons/x.svg",
					provider: "x",
					providerData: {
						followerCount: 12800,
						followerCountLabel: "12.8K",
						followerCountApproximate: true,
					},
					presentation: {
						provider: "x",
						providerLabel: "X",
						cardBackground: "#f7f7f7",
						actionBackground: "#000000",
						actionText: "#ffffff",
						actionLabel: "Follow",
						actionDetail: "12.8K",
						actionVariant: "solid",
					},
				},
			},
			layouts: previewLayouts("squareSmall"),
			createdAt: PREVIEW_TIMESTAMP,
			updatedAt: PREVIEW_TIMESTAMP,
			preset: "squareSmall",
		},
	},
];

export default function BentoPreview({
	visible = true,
	wideOnly = false,
}: {
	visible?: boolean;
	wideOnly?: boolean;
}) {
	const reduceMotion = useReducedMotion();

	return (
		<motion.section
			aria-label="Bento item preview"
			aria-hidden="true"
			className={`pointer-events-none relative hidden min-h-96 cursor-default select-none items-center justify-center overflow-visible px-6 py-12 xl:px-0 ${wideOnly ? "min-[90rem]:flex min-[90rem]:min-h-svh" : "xl:flex xl:min-h-svh"}`}
			inert
			initial={false}
			animate={{ opacity: visible ? 1 : 0 }}
			transition={
				reduceMotion
					? { duration: 0 }
					: { type: "spring", duration: 0.55, bounce: 0.15 }
			}
		>
			<div
				className="relative h-[588px] w-[796px] shrink-0"
				style={{
					aspectRatio: `${PREVIEW_GRID_WIDTH} / ${PREVIEW_GRID_HEIGHT}`,
				}}
			>
				<div
					className="grid size-full grid-cols-4 grid-rows-6"
					style={{
						columnGap: PREVIEW_COLUMN_GAP,
						rowGap: PREVIEW_ROW_GAP,
					}}
				>
					{previewItems.map(({ className, delay, item }) => (
						<motion.div
							animate={
								reduceMotion
									? { y: 0, rotate: 0 }
									: { y: [0, -8, 0], rotate: [-1.5, 1.5, -1.5] }
							}
							className={`min-h-0 min-w-0 ${className}`}
							initial={reduceMotion ? false : { y: 0, rotate: -1.5 }}
							key={item.id}
							transition={
								reduceMotion
									? { duration: 0 }
									: {
											delay,
											duration: 5,
											ease: "easeInOut",
											repeat: Number.POSITIVE_INFINITY,
										}
							}
						>
							<BentoItemShell
								item={item}
								breakpoint="wide"
								mode="view"
								autoFocus={false}
							/>
						</motion.div>
					))}
				</div>
			</div>
		</motion.section>
	);
}
