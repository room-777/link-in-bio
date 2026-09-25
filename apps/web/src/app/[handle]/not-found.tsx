"use client";

import {
	bentoMargin,
	bentoRowHeight,
	getBentoWidth,
	getPresetGeometry,
} from "@grabbin/bento-layout";
import { Button } from "@grabbin/ui/components/button";
import { motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { BentoItemShell } from "@/components/page/bento/bento-item-shell";
import type { BentoItem } from "@/lib/bento/bento-types";

const PREVIEW_TIMESTAMP = "2026-01-01T00:00:00.000Z";
const SMALL_SQUARE_LAYOUT = getPresetGeometry("squareSmall", "wide");
const PREVIEW_FAN_WIDTH = 520;
const PREVIEW_FAN_HEIGHT = 240;

function getPreviewCardSize(layout: BentoItem["layouts"]["wide"]) {
	return {
		width: getBentoWidth(layout.w),
		height: bentoRowHeight * layout.h + bentoMargin[1] * (layout.h - 1),
	};
}

const previewCards: Array<{
	item: BentoItem;
	rotation: number;
	fanOffset: number;
	fanTop: number;
	zIndex: number;
}> = [
	{
		item: {
			id: "not-found-github",
			type: "link",
			style: {},
			data: {
				url: "https://github.com/example",
				metadata: {
					title: "northstar-labs",
					faviconUrl: "/api/provider-icons/github.svg",
					provider: "github",
					providerData: { followers: 34 },
					presentation: {
						provider: "github",
						providerLabel: "GitHub",
						cardBackground: "#ffffff",
						actionBackground: "#f6f8fa",
						actionText: "#000000",
						actionLabel: "Follow",
						actionDetail: "34",
						actionVariant: "outline",
					},
				},
			},
			layouts: {
				wide: SMALL_SQUARE_LAYOUT,
				compact: SMALL_SQUARE_LAYOUT,
			},
			createdAt: PREVIEW_TIMESTAMP,
			updatedAt: PREVIEW_TIMESTAMP,
			preset: "squareSmall",
		},
		rotation: -5,
		fanOffset: 174,
		fanTop: 18,
		zIndex: 2,
	},
	{
		item: {
			id: "not-found-instagram",
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
					},
				},
			},
			layouts: {
				wide: SMALL_SQUARE_LAYOUT,
				compact: SMALL_SQUARE_LAYOUT,
			},
			createdAt: PREVIEW_TIMESTAMP,
			updatedAt: PREVIEW_TIMESTAMP,
			preset: "squareSmall",
		},
		rotation: -12,
		fanOffset: 38,
		fanTop: 50,
		zIndex: 1,
	},
	{
		item: {
			id: "not-found-image",
			type: "media",
			style: {},
			data: {
				objectKey: "not-found-preview-image",
				mimeType: "image/png",
				mediaUrl: "/media-widget-sunset.png",
			},
			layouts: { wide: SMALL_SQUARE_LAYOUT, compact: SMALL_SQUARE_LAYOUT },
			createdAt: PREVIEW_TIMESTAMP,
			updatedAt: PREVIEW_TIMESTAMP,
			preset: "squareSmall",
		},
		rotation: 12,
		fanOffset: 310,
		fanTop: 42,
		zIndex: 3,
	},
];

export default function NotFound() {
	const reduceMotion = useReducedMotion();

	return (
		<main className="relative isolate grid min-h-svh place-items-center overflow-x-clip bg-background px-6 py-16 text-center">
			<section className="z-10 flex flex-col items-center">
				<h1 className="mb-4 font-semibold text-[clamp(4.5rem,13vw,6.25rem)] text-primary/90 leading-none tracking-tight">
					404
				</h1>
				<p className="max-w-xs text-pretty text-primary/80 text-sm leading-6">
					We&apos;ve looked everywhere, but couldn&apos;t find what you were
					looking for. It may have moved or been removed.
				</p>
				<Button
					className="mt-6 text-muted-foreground"
					variant="secondary"
					size="default"
					nativeButton={false}
					render={<Link href="/" />}
				>
					Go home
				</Button>
			</section>

			<div
				aria-hidden="true"
				className="pointer-events-none absolute top-[calc(50%+12rem)] left-1/2 z-0 -translate-x-1/2"
				inert
				style={{
					width: `min(${PREVIEW_FAN_WIDTH}px, calc(100vw - 2rem))`,
					aspectRatio: `${PREVIEW_FAN_WIDTH} / ${PREVIEW_FAN_HEIGHT}`,
				}}
			>
				{previewCards.map(
					({ item, rotation, fanOffset, fanTop, zIndex }, index) => {
						const size = getPreviewCardSize(
							getPresetGeometry(item.preset ?? "squareSmall", "wide"),
						);

						return (
							<motion.div
								key={item.id}
								className="absolute text-left"
								style={{
									left: `${(fanOffset / PREVIEW_FAN_WIDTH) * 100}%`,
									top: `${(fanTop / PREVIEW_FAN_HEIGHT) * 100}%`,
									width: `${(size.width / PREVIEW_FAN_WIDTH) * 100}%`,
									height: `${(size.height / PREVIEW_FAN_HEIGHT) * 100}%`,
									zIndex,
								}}
								initial={
									reduceMotion
										? false
										: { opacity: 0, y: 48, scale: 0.72, rotate: rotation * 2 }
								}
								animate={{ opacity: 1, y: 0, scale: 1, rotate: rotation }}
								transition={
									reduceMotion
										? { duration: 0 }
										: {
												type: "spring",
												stiffness: 220,
												damping: 16,
												delay: index * 0.12,
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
						);
					},
				)}
			</div>
		</main>
	);
}
