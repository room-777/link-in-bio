"use client";

import { motion, useReducedMotion } from "motion/react";
import Image from "next/image";
import { PlanPicker } from "@/components/billing/plan-dialog";

export default function PlanSection() {
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
			aria-labelledby="landing-plan-title"
			className="w-full px-6 py-24 sm:px-10 sm:py-32"
		>
			<div className="mx-auto flex w-full max-w-5xl flex-col items-center gap-10 sm:gap-14">
				<motion.div
					className="grid gap-3 text-center"
					initial={initial}
					whileInView={animate}
					viewport={viewport}
					transition={transition}
				>
					<h2
						id="landing-plan-title"
						className="text-pretty font-medium text-3xl text-foreground leading-tight tracking-[-0.065em] sm:text-4xl lg:text-5xl"
					>
						More room for everything you share.
					</h2>
					<p className="text-pretty text-muted-foreground sm:text-lg">
						Start free. Upgrade to Pro for more pages and a page without the
						Grabbin watermark.
					</p>
				</motion.div>
				<motion.div
					className="relative mt-16 w-full max-w-sm"
					initial={initial}
					whileInView={animate}
					viewport={viewport}
					transition={{ ...transition, delay: reduceMotion ? 0 : 0.1 }}
				>
					<Image
						alt=""
						aria-hidden="true"
						className="pointer-events-none absolute -top-12 -right-8 z-0 w-32 rotate-12 sm:-top-16 sm:right-[-1.5rem] sm:w-40 lg:-top-20 lg:w-48"
						height={1254}
						sizes="(min-width: 1024px) 192px, (min-width: 640px) 160px, 128px"
						src="/images/landing/media-doodles-2.png"
						width={1254}
					/>
					<div className="relative z-10 w-full">
						<PlanPicker
							variant="default"
							className="smooth-shadow-ring-sm rounded-[2rem]"
						/>
					</div>
				</motion.div>
			</div>
		</section>
	);
}
