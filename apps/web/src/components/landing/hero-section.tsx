"use client";

import { getPresetGeometry } from "@grabbin/bento-layout";
import { motion, useReducedMotion } from "motion/react";
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
				className={`w-[178px] drop-shadow-[0_10px_16px_rgba(15,15,40,0.14)] ${card.preset === "portrait" ? "h-[396px]" : "h-[178px]"}`}
				initial={reduceMotion ? false : { opacity: 0, scale: 0.65, rotate: 0 }}
				animate={{
					opacity: 1,
					scale: 1,
					rotate: card.rotate,
					y: reduceMotion ? 0 : [0, -5, 0, 5, 0],
				}}
				transition={{
					duration: reduceMotion ? 0 : 0.85,
					delay: reduceMotion ? 0 : 3.35,
					type: "spring",
					stiffness: 160,
					damping: 20,
					y: {
						duration: reduceMotion ? 0 : 5,
						delay: reduceMotion ? 0 : 3.35,
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
			<div className="mx-auto flex w-full max-w-7xl flex-col items-center px-6 pt-44 text-center sm:px-10 sm:pt-48">
				<h1 className="max-w-3xl text-balance font-semibold text-4xl leading-[0.98] tracking-[-0.065em] sm:text-7xl xl:text-[5rem]">
					<motion.span
						className="block"
						initial={reduceMotion ? false : { opacity: 0, y: -16 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{
							duration: reduceMotion ? 0 : 0.8,
							delay: reduceMotion ? 0 : 0,
							ease: [0.22, 1, 0.36, 1],
						}}
					>
						Your link in bio
					</motion.span>
					<motion.span
						className="block"
						initial={reduceMotion ? false : { opacity: 0, y: -16 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{
							duration: reduceMotion ? 0 : 0.8,
							delay: reduceMotion ? 0 : 0.55,
							ease: [0.22, 1, 0.36, 1],
						}}
					>
						Made to feel like you.
					</motion.span>
				</h1>
				<motion.div
					className="mt-8"
					initial={reduceMotion ? false : { opacity: 0, y: -16 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{
						duration: reduceMotion ? 0 : 0.8,
						delay: reduceMotion ? 0 : 1.4,
						ease: [0.22, 1, 0.36, 1],
					}}
				>
					<JoinForFreeButton
						className="h-[72px] w-auto min-w-[260px] rounded-full px-10 text-xl"
						variant="brandBlack"
					>
						Create yours
					</JoinForFreeButton>
				</motion.div>
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
					className="relative z-10 w-[clamp(300px,27vw,390px)] max-w-full self-start max-[700px]:w-[min(86vw,390px)]"
					initial={reduceMotion ? false : { opacity: 0, y: 24 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{
						duration: reduceMotion ? 0 : 1,
						delay: reduceMotion ? 0 : 2.3,
						ease: [0.22, 1, 0.36, 1],
					}}
				>
					<div
						aria-hidden="true"
						className="pointer-events-none absolute inset-x-[2%] inset-y-[0.94%] z-0 rounded-[19.3%/9.2%] shadow-[0_18px_40px_rgba(15,15,40,0.16),0_50px_100px_rgba(15,15,40,0.14)]"
					/>
					<div className="absolute inset-y-0 right-[2.8%] left-[2.8%] h-full overflow-hidden rounded-[10%]">
						<img
							src="/images/test2/profile-preview.webp"
							alt="Example Grabbin profile page"
							className="h-full w-full object-contain object-center"
							width={800}
							height={600}
							loading="eager"
							fetchPriority="high"
							decoding="async"
						/>
					</div>
					<img
						src="/images/test2/phone-frame.webp"
						alt=""
						aria-hidden="true"
						className="relative z-20 block h-auto w-full"
						width={1170}
						height={2392}
						loading="eager"
						fetchPriority="high"
						decoding="async"
					/>
				</motion.div>
			</div>
		</section>
	);
}
