"use client";

import { motion, useReducedMotion } from "motion/react";
import Image from "next/image";

export default function DemoSection() {
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
			aria-labelledby="landing-demo-title"
			className="w-full px-6 py-24 sm:px-10 sm:py-32"
			id="demo"
		>
			<div className="mx-auto flex w-full max-w-7xl flex-col items-center gap-10 sm:gap-14">
				<motion.h2
					className="text-pretty text-center font-medium text-3xl text-foreground leading-tight tracking-[-0.065em] sm:text-4xl lg:text-5xl"
					id="landing-demo-title"
					initial={initial}
					whileInView={animate}
					viewport={viewport}
					transition={transition}
				>
					<span className="block">Give people one link</span>
					<span className="block">to everything you share.</span>
				</motion.h2>
				<motion.div
					className="w-full"
					initial={initial}
					whileInView={animate}
					viewport={viewport}
					transition={{ ...transition, delay: reduceMotion ? 0 : 0.12 }}
				>
					<Image
						alt="A Wooky page with social profiles, music, apps, and other links."
						className="h-auto w-full rounded-2xl border border-border/70 shadow-lg"
						height={2070}
						sizes="(max-width: 768px) 100vw, 1280px"
						src="/images/landing/demo-page.png"
						width={3440}
					/>
				</motion.div>
			</div>
		</section>
	);
}
