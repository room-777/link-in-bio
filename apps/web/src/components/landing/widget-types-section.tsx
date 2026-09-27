"use client";

import { TextReveal } from "@grabbin/ui/components/ui/TextReveal";
import { motion, useReducedMotion } from "motion/react";
import Image from "next/image";

export default function WidgetTypesSection() {
	const reduceMotion = useReducedMotion();
	const initial = reduceMotion ? false : { opacity: 0, y: 16 };
	const animate = { opacity: 1, y: 0 };
	const transition = {
		duration: reduceMotion ? 0 : 0.55,
		ease: [0.22, 1, 0.36, 1] as const,
	};
	const viewport = { once: true, amount: 0.2 };

	return (
		<section
			aria-labelledby="landing-widget-types-title"
			className="relative isolate min-h-svh w-full px-6 py-24 sm:px-10 sm:py-32"
		>
			<Image
				alt=""
				aria-hidden="true"
				className="pointer-events-none absolute top-[14rem] left-[3%] z-0 hidden w-32 -rotate-12 md:block lg:left-[7%] lg:w-48"
				height={1254}
				sizes="(min-width: 1024px) 192px, 128px"
				src="/images/landing/media-doodles-1.png"
				width={1254}
			/>
			<Image
				alt=""
				aria-hidden="true"
				className="pointer-events-none absolute top-[19rem] right-[3%] z-0 hidden w-36 rotate-12 md:block lg:right-[8%] lg:w-52"
				height={1254}
				sizes="(min-width: 1024px) 208px, 144px"
				src="/images/landing/media-doodles-2.png"
				width={1254}
			/>
			<div className="relative z-10 mx-auto flex w-full max-w-5xl flex-col items-center gap-40">
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
				<motion.div
					className="w-full"
					initial={initial}
					whileInView={animate}
					viewport={viewport}
					transition={{ ...transition, delay: reduceMotion ? 0 : 0.1 }}
				>
					<TextReveal
						className="!py-0 w-full"
						paragraphClassName="text-pretty text-xl font-normal leading-relaxed sm:text-2xl"
						paragraphs={[
							"Your page can say more than text and links alone. Rich link previews add context, maps show the places you spend time, and media brings your work to life.",
						]}
						highlightColor="#4ade80"
						darkHighlightColor="#4ade80"
						lightWatermarkColor="#d4d4d4"
						darkWatermarkColor="#525252"
						lightTextColor="#171717"
						darkTextColor="#e5e5e5"
					/>
				</motion.div>
			</div>
		</section>
	);
}
