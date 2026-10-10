"use client";

import { getPresetGeometry } from "@grabbin/bento-layout";
import { motion, useReducedMotion } from "motion/react";
import Image from "next/image";
import JoinForFreeButton from "@/components/landing/join-for-free-button";
import { BentoItemShell } from "@/components/page/editor/bento/bento-item-shell";
import { MapViewportGate } from "@/components/page/editor/bento/items/shared";
import type { BentoItem } from "@/lib/bento/bento-types";
import { DEMO_PAGE_RESPONSE } from "@/lib/demo-page";

const dummyCards = [
	{ id: "github", preset: "portrait", className: "left-0 top-0", rotate: -6 },
	{
		id: "instagram",
		preset: "squareSmall",
		className: "left-[120px] top-[150px]",
		rotate: 5,
	},
	{
		id: "youtube",
		preset: "squareSmall",
		className: "left-10 top-7",
		rotate: -4,
	},
	{
		id: "location",
		preset: "squareSmall",
		className: "left-[175px] top-[145px]",
		rotate: 6,
	},
] as const;

function getDummyCard(id: string, preset: "portrait" | "squareSmall") {
	const item = DEMO_PAGE_RESPONSE.items.find((item) => item.id === id);
	if (!item) throw new Error(`Missing demo item: ${id}`);
	return {
		...item,
		preset,
		layouts: {
			wide: getPresetGeometry(preset, "wide"),
			compact: getPresetGeometry(preset, "compact"),
		},
	} as BentoItem;
}

function HeroDummyCard({
	card,
	reduceMotion,
}: {
	card: (typeof dummyCards)[number];
	reduceMotion: boolean;
}) {
	const item = getDummyCard(card.id, card.preset);
	const shell = (
		<BentoItemShell
			item={item}
			breakpoint="wide"
			mode="view"
			autoFocus={false}
			disableLocationSearch
		/>
	);

	return (
		<div className={`absolute origin-top-left ${card.className}`}>
			<motion.div
				className={`w-[178px] ${card.preset === "portrait" ? "h-[396px]" : "h-[178px]"}`}
				initial={reduceMotion ? false : { opacity: 0, scale: 0.65, rotate: 0 }}
				animate={{
					opacity: 1,
					scale: 1,
					rotate: card.rotate,
					y: reduceMotion ? 0 : [0, -5, 0, 5, 0],
				}}
				transition={{
					duration: reduceMotion ? 0 : 0.55,
					delay: reduceMotion ? 0 : 1.25,
					type: "spring",
					stiffness: 240,
					damping: 14,
					y: {
						duration: reduceMotion ? 0 : 5,
						delay: reduceMotion ? 0 : 1.25,
						repeat: reduceMotion ? 0 : Number.POSITIVE_INFINITY,
						ease: "easeInOut",
					},
				}}
			>
				{card.id === "location" ? (
					<MapViewportGate
						placeholder={<div className="size-full rounded-2xl bg-secondary" />}
					>
						{shell}
					</MapViewportGate>
				) : (
					shell
				)}
			</motion.div>
		</div>
	);
}

export default function HeroSection() {
	const reduceMotion = useReducedMotion();

	return (
		<section id="hero" className="relative w-full overflow-x-clip">
			<div className="mx-auto flex w-full max-w-7xl flex-col items-center px-6 pt-36 text-center sm:px-10 sm:pt-40">
				<h1 className="max-w-3xl text-balance font-semibold text-5xl leading-[0.98] tracking-[-0.065em] sm:text-7xl xl:text-[5rem]">
					Your link in bio
					<br />
					Made to feel like you.
				</h1>
				<JoinForFreeButton
					className="mt-8 h-[72px] w-auto min-w-[260px] rounded-full px-10 text-xl"
					variant="brandBlack"
				>
					Create yours
				</JoinForFreeButton>
			</div>

			<div className="relative mx-auto mt-14 flex min-h-[620px] w-full max-w-[1100px] justify-center px-4 sm:mt-20 sm:min-h-[720px]">
				<div
					aria-hidden="true"
					inert
					className="pointer-events-none absolute inset-x-0 top-10 z-0 mx-auto hidden h-[440px] w-full lg:block"
				>
					<div className="absolute top-0 left-0 h-full w-[320px]">
						{dummyCards.slice(0, 2).map((card) => (
							<HeroDummyCard
								key={card.id}
								card={card}
								reduceMotion={Boolean(reduceMotion)}
							/>
						))}
					</div>
					<div className="absolute top-0 right-0 h-full w-[340px]">
						{dummyCards.slice(2).map((card) => (
							<HeroDummyCard
								key={card.id}
								card={card}
								reduceMotion={Boolean(reduceMotion)}
							/>
						))}
					</div>
				</div>

				<motion.div
					className="relative z-10 max-w-full self-start"
					style={{ width: "min(78vw, 430px)" }}
					initial={reduceMotion ? false : { opacity: 0, y: 24 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{
						duration: reduceMotion ? 0 : 0.8,
						delay: reduceMotion ? 0 : 0.2,
						ease: [0.22, 1, 0.36, 1],
					}}
				>
					<div className="absolute inset-y-0 right-[2.8%] left-[2.8%] h-full overflow-hidden rounded-[10%]">
						<Image
							src="/images/test2/profile-preview.png"
							alt="Example Grabbin profile page"
							className="h-full w-full object-contain object-center"
							fill
							priority
							sizes="(min-width: 768px) 430px, 78vw"
						/>
					</div>
					<Image
						src="/images/test2/phone-frame.webp"
						alt=""
						aria-hidden="true"
						className="relative block h-auto w-full"
						width={560}
						height={1120}
						priority
						sizes="(min-width: 768px) 430px, 78vw"
					/>
				</motion.div>
			</div>
		</section>
	);
}
