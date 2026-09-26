"use client";

import type { PageItemLinkMetadata } from "@grabbin/api";
import { getPresetGeometry, type PresetName } from "@grabbin/bento-layout";
import { resolveLinkMetadata } from "@grabbin/page-link";
import { Tabs, TabsList, TabsTrigger } from "@grabbin/ui/components/tabs";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import Image from "next/image";
import { useState } from "react";
import { BentoItemShell } from "@/components/page/bento/bento-item-shell";
import { MapViewportGate } from "@/components/page/bento/items/shared";
import type { BentoItem } from "@/lib/bento/bento-types";

const previewTimestamp = "2026-01-01T00:00:00.000Z";
const previewImageUrls = [
	"https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80",
	"https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=1200&q=80",
];

function createPreviewItem(
	id: string,
	type: BentoItem["type"],
	data: unknown,
	preset: PresetName = "squareLarge",
): BentoItem {
	const geometry = getPresetGeometry(preset, "wide");
	return {
		id,
		type,
		preset,
		style: {},
		data,
		layouts: { wide: geometry, compact: geometry },
		createdAt: previewTimestamp,
		updatedAt: previewTimestamp,
	} as BentoItem;
}

function createLinkPreview(
	id: string,
	url: string,
	title: string,
	providerData: NonNullable<PageItemLinkMetadata["providerData"]>,
	imageUrl: string,
) {
	const metadata = resolveLinkMetadata(url, { title, providerData });
	return createPreviewItem(
		`landing-preview-${id}`,
		"link",
		{
			url,
			metadata: {
				...metadata,
				presentation: {
					...metadata.presentation,
					imageUrls: [imageUrl],
				},
			},
		},
		"squareLarge",
	);
}

const previews = {
	text: [
		createPreviewItem("landing-preview-text-back", "text", {
			text: "My favorite places are rarely the loudest ones. This list is for the neighborhood café with good light, the path through the pines, and the small bookstore where I always lose track of time.",
		}),
		createPreviewItem("landing-preview-text-front", "text", {
			text: "Use this space to introduce yourself, add context to a collection, or share a note that does not fit inside a link. A few thoughtful lines can help visitors understand what matters to you before they explore.",
		}),
	],
	link: [
		createLinkPreview(
			"github",
			"https://github.com/northstar-labs",
			"northstar-labs",
			{ followers: 3400 },
			previewImageUrls[0],
		),
		createLinkPreview(
			"x",
			"https://x.com/cityframes",
			"@cityframes",
			{ followerCount: 12800, followerCountApproximate: true },
			previewImageUrls[1],
		),
	],
	media: [
		createPreviewItem("landing-preview-media", "media", {
			objectKey: "landing-preview-media",
			mimeType: "image/png",
			mediaUrl: "/media-widget-sunset.png",
		}),
	],
	map: [
		createPreviewItem("landing-preview-map", "map", {
			latitude: 43.2025,
			longitude: 140.9944,
			zoom: 11,
			caption: "Otaru, Hokkaido",
		}),
	],
} satisfies Record<Exclude<BentoItem["type"], "section">, BentoItem[]>;

type WidgetType = keyof typeof previews;
const widgetTypes: WidgetType[] = ["text", "link", "media", "map"];

export default function WidgetTypesSection() {
	const [selectedType, setSelectedType] = useState<WidgetType>("link");
	const shouldReduceMotion = useReducedMotion();
	const initial = shouldReduceMotion ? false : { opacity: 0, y: 16 };
	const animate = { opacity: 1, y: 0 };
	const transition = {
		duration: shouldReduceMotion ? 0 : 0.55,
		ease: [0.22, 1, 0.36, 1] as const,
	};
	const viewport = { once: true, amount: 0.2 };
	const selectedPreviews = previews[selectedType];
	const isStackedPreview = selectedType === "text" || selectedType === "link";

	return (
		<section
			aria-labelledby="landing-widget-types-title"
			className="relative isolate w-full px-6 py-24 sm:px-10 sm:py-32"
		>
			<Image
				alt=""
				aria-hidden="true"
				className="pointer-events-none absolute top-[22rem] left-[3%] z-0 hidden w-28 -rotate-12 md:block lg:left-[7%] lg:w-40"
				height={1254}
				sizes="(min-width: 1024px) 160px, 112px"
				src="/images/landing/media-doodles-1.png"
				width={1254}
			/>
			<Image
				alt=""
				aria-hidden="true"
				className="pointer-events-none absolute top-[30rem] right-[3%] z-0 hidden w-32 rotate-12 md:block lg:right-[8%] lg:w-44"
				height={1254}
				sizes="(min-width: 1024px) 176px, 128px"
				src="/images/landing/media-doodles-2.png"
				width={1254}
			/>
			<div className="relative z-10 mx-auto flex w-full flex-col gap-16 sm:gap-20">
				<div className="flex flex-col items-center gap-4">
					<motion.h2
						className="text-pretty text-center font-medium text-3xl text-foreground leading-tight tracking-[-0.065em] sm:text-4xl lg:text-5xl"
						id="landing-widget-types-title"
						initial={initial}
						whileInView={animate}
						viewport={viewport}
						transition={transition}
					>
						<span className="block">Everything you share,</span>
						<span className="block">in one simple page.</span>
					</motion.h2>
					<motion.p
						className="max-w-2xl text-pretty text-center text-base text-muted-foreground leading-relaxed sm:text-lg"
						initial={initial}
						whileInView={animate}
						viewport={viewport}
						transition={{ ...transition, delay: shouldReduceMotion ? 0 : 0.08 }}
					>
						Choose widgets that fit the moment and make your page feel like you.
					</motion.p>
				</div>
				<motion.div
					className="mx-auto flex w-full max-w-5xl flex-col items-center gap-12 sm:gap-16"
					initial={initial}
					whileInView={animate}
					viewport={viewport}
					transition={{ ...transition, delay: shouldReduceMotion ? 0 : 0.16 }}
				>
					<Tabs
						value={selectedType}
						onValueChange={(value) => {
							if (widgetTypes.includes(value as WidgetType))
								setSelectedType(value as WidgetType);
						}}
						className="w-fit max-w-full items-center"
					>
						<TabsList size="default" className="grid grid-cols-4 gap-1 p-0.5">
							{widgetTypes.map((type) => (
								<TabsTrigger
									key={type}
									value={type}
									id={`landing-widget-tab-${type}`}
									aria-controls="landing-widget-preview"
								>
									{type[0].toUpperCase() + type.slice(1)}
								</TabsTrigger>
							))}
						</TabsList>
					</Tabs>
					<div
						aria-labelledby={`landing-widget-tab-${selectedType}`}
						className="flex w-full flex-col gap-6"
						id="landing-widget-preview"
						role="tabpanel"
					>
						<p aria-live="polite" className="sr-only">
							Showing {selectedType} cards.
						</p>
						<AnimatePresence initial={false} mode="wait">
							<motion.div
								animate={{ opacity: 1 }}
								className={
									isStackedPreview
										? "relative mx-auto aspect-square w-[min(82vw,22rem)]"
										: "mx-auto flex w-full flex-col items-center"
								}
								exit={{ opacity: 0 }}
								initial={{ opacity: 0 }}
								key={selectedType}
								transition={{
									duration: shouldReduceMotion ? 0 : 0.2,
								}}
							>
								{selectedPreviews.map((item, index) => (
									<div
										aria-hidden="true"
										className={
											isStackedPreview
												? `absolute inset-0 ${index === 0 ? "translate-x-4 -translate-y-3 rotate-[4deg]" : "translate-x-3 -translate-y-2 -rotate-[2deg]"}`
												: "relative aspect-square w-full max-w-[380px]"
										}
										inert
										key={item.id}
									>
										{item.type === "map" ? (
											<MapViewportGate
												placeholder={
													<div className="size-full rounded-2xl bg-secondary" />
												}
											>
												<BentoItemShell
													item={item}
													breakpoint="wide"
													mode="view"
													autoFocus={false}
												/>
											</MapViewportGate>
										) : (
											<BentoItemShell
												item={item}
												breakpoint="wide"
												mode="view"
												autoFocus={false}
											/>
										)}
									</div>
								))}
							</motion.div>
						</AnimatePresence>
					</div>
				</motion.div>
			</div>
		</section>
	);
}
