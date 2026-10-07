"use client";

import { getPresetGeometry } from "@grabbin/bento-layout";
import { Button } from "@grabbin/ui/components/button";
import { motion, useReducedMotion } from "motion/react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import JoinForFreeButton from "@/components/landing/join-for-free-button";
import { BentoItemShell } from "@/components/page/editor/bento/bento-item-shell";
import { MapViewportGate } from "@/components/page/editor/bento/items/shared";
import type { BentoItem } from "@/lib/bento/bento-types";
import { DEMO_PAGE_RESPONSE } from "@/lib/demo-page";

const dummyCards = [
	{
		id: "github",
		preset: "portrait",
		className: "left-0 top-0",
		rotate: -6,
	},
	{
		id: "instagram",
		preset: "squareSmall",
		className: "left-[120px] top-[150px]",
		rotate: 5,
	},
	{
		id: "youtube",
		preset: "squareSmall",
		className: "left-5 top-7",
		rotate: -4,
	},
	{
		id: "location",
		preset: "squareSmall",
		className: "left-[155px] top-[145px]",
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
				animate={{ opacity: 1, scale: 1, rotate: card.rotate }}
				transition={{
					duration: reduceMotion ? 0 : 0.55,
					delay: reduceMotion ? 0 : 1.25,
					type: "spring",
					stiffness: 240,
					damping: 14,
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
	const [tryDemoVisible, setTryDemoVisible] = useState(false);
	const initial = reduceMotion
		? false
		: { opacity: 0, y: 12, filter: "blur(4px)" };
	const animate = { opacity: 1, y: 0, filter: "blur(0px)" };
	const transition = {
		duration: reduceMotion ? 0 : 0.9,
		ease: [0.22, 1, 0.36, 1] as const,
	};
	const visualTransition = {
		duration: reduceMotion ? 0 : 0.8,
		delay: reduceMotion ? 0 : 1.35,
		ease: [0.23, 1, 0.32, 1] as const,
	};

	return (
		<section
			id="hero"
			className="relative flex min-h-svh w-full flex-col overflow-x-clip"
		>
			<div className="relative z-10 mx-auto flex w-full max-w-7xl flex-col items-center px-6 pt-48 sm:px-10">
				<motion.h1
					className="max-w-xl text-balance text-center font-semibold text-4xl tracking-tighter sm:text-6xl"
					initial={initial}
					animate={animate}
					transition={transition}
				>
					Your <span className="rounded-3xl bg-brand/20 px-2">link in bio</span>{" "}
					Made to feel like you.
				</motion.h1>
				<motion.p
					className="mx-auto mt-5 max-w-xl text-pretty text-center font-medium text-base text-primary/80 leading-7 sm:text-xl"
					initial={initial}
					animate={animate}
					transition={{ ...transition, delay: 0.15 }}
				>
					Bring your links, photos, social profiles, and favorite places
					together on a page you can shape your way.
				</motion.p>
				<motion.div
					className="mt-6"
					initial={initial}
					animate={animate}
					transition={{ ...transition, delay: 0.3 }}
				>
					<JoinForFreeButton className={"h-12 w-36 rounded-3xl"} />
				</motion.div>
			</div>
			<div
				aria-hidden="true"
				inert
				className="pointer-events-none absolute inset-x-0 top-32 z-0 mx-auto hidden h-[440px] w-full max-w-7xl xl:block"
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
			<div className="relative isolate mt-24 aspect-square w-full sm:mt-32 lg:mt-40 lg:aspect-[16/9]">
				<motion.div
					aria-hidden="true"
					className="absolute inset-0 z-0"
					initial={reduceMotion ? false : { opacity: 0 }}
					animate={{ opacity: 1 }}
					transition={visualTransition}
				>
					<Image
						alt=""
						className="absolute inset-0 h-full w-full object-cover"
						height={578}
						priority
						quality={98}
						sizes="100vw"
						src="/images/landing/hero-background-rust-f942085b6acc.webp"
						width={1024}
					/>
					<div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/10" />
				</motion.div>
				<motion.div
					className="absolute top-0 left-1/2 z-20 flex h-[52px] -translate-x-1/2 items-start justify-center rounded-b-[32px] bg-background px-3"
					initial={reduceMotion ? false : { opacity: 0 }}
					animate={{ opacity: 1 }}
					transition={visualTransition}
					onAnimationComplete={() => setTryDemoVisible(true)}
					inert={!tryDemoVisible}
				>
					<div
						className="absolute top-0 -left-[31px] h-8 w-8"
						style={{
							background:
								"radial-gradient(circle at 0% 100%, transparent 32px, var(--color-background) 32.5px)",
						}}
					/>
					<div
						className="absolute top-0 -right-[31px] h-8 w-8"
						style={{
							background:
								"radial-gradient(circle at 100% 100%, transparent 32px, var(--color-background) 32.5px)",
						}}
					/>
					<Button
						className="rounded-full px-6"
						size="xl"
						nativeButton={false}
						render={<Link href="/demo">Try demo</Link>}
						variant="secondary"
					/>
				</motion.div>
				<motion.div
					className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center px-3 sm:px-8"
					initial={reduceMotion ? false : { opacity: 0 }}
					animate={{ opacity: 1 }}
					transition={visualTransition}
				>
					<div className="relative w-[76%] overflow-hidden rounded-xl bg-background shadow-2xl shadow-black/20 outline-1 outline-black/10 lg:w-[60%]">
						<Image
							alt="Example personal page with a profile, social links, photos, and a map"
							className="block h-auto w-full"
							height={1745}
							quality={96}
							sizes="(min-width: 1024px) 60vw, 76vw"
							src="/images/landing/hero-demo-df9ddb35724f.webp"
							width={2800}
						/>
					</div>
				</motion.div>
			</div>
		</section>
	);
}
