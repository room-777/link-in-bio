"use client";

import { motion, useReducedMotion } from "motion/react";
import { PlanPicker } from "@/components/billing/plan-picker";
import JoinForFreeButton from "@/components/landing/join-for-free-button";

const freeFeatures = [
	"Unlimited photos and videos",
	"Unlimited links",
	"Customize your page with drag and drop",
];

export default function PlanSection({
	isAuthenticated,
}: {
	isAuthenticated?: boolean;
} = {}) {
	const reduceMotion = useReducedMotion();
	const initial = reduceMotion ? false : { opacity: 0, y: 16 };
	const animate = { opacity: 1, y: 0 };
	const transition = {
		duration: reduceMotion ? 0 : 0.55,
		ease: [0.22, 1, 0.36, 1] as const,
	};
	const viewport = { once: true, amount: 0.2 };
	const horizontalPadding =
		"px-8 sm:px-16 md:px-20 lg:px-28 xl:px-36 2xl:px-40";

	return (
		<section
			aria-labelledby="landing-plan-title"
			className="w-full py-24 sm:py-32"
		>
			<div className="flex w-full flex-col gap-10 sm:gap-14">
				<motion.div
					className="flex w-full flex-col items-center gap-5 text-center"
					initial={initial}
					whileInView={animate}
					viewport={viewport}
					transition={transition}
				>
					<h2
						id="landing-plan-title"
						className={`w-full max-w-screen-2xl text-balance ${horizontalPadding} font-semibold text-[clamp(1.25rem,6.2vw,1.75rem)] leading-tight tracking-tighter sm:text-[clamp(1.75rem,3.5vw,3.25rem)] lg:text-[clamp(2.25rem,3.5vw,3.25rem)]`}
					>
						<span className="block">Build for free.</span>
						<span className="mt-1.5 block">Upgrade when you need.</span>
					</h2>
				</motion.div>

				<motion.div
					className={`mx-auto flex w-full max-w-screen-2xl flex-col gap-10 ${horizontalPadding}`}
					initial={initial}
					whileInView={animate}
					viewport={viewport}
					transition={transition}
				>
					<div className="text-center lg:pt-1">
						<ul className="flex flex-col justify-items-center gap-2 text-lg leading-snug sm:text-2xl">
							{freeFeatures.map((feature) => (
								<li key={feature}>{feature}</li>
							))}
						</ul>
					</div>
					<div className="my-6 text-center text-base text-muted-foreground sm:text-2xl">
						<p>or...</p>
					</div>
					<div className="smooth-shadow-xs mx-auto flex w-full max-w-md flex-col gap-3 rounded-[2rem] border border-border p-3 pb-7 text-center">
						<PlanPicker
							variant="landing"
							className="w-full"
							isAuthenticated={isAuthenticated}
						/>
						<JoinForFreeButton
							variant="outline"
							className="mx-5 h-12 w-auto max-w-sm rounded-full text-lg"
						>
							or Join for free
						</JoinForFreeButton>
					</div>
					<p className="text-center text-muted-foreground text-sm">
						Free as long as we can sustainably support them.
					</p>
				</motion.div>
			</div>
		</section>
	);
}
