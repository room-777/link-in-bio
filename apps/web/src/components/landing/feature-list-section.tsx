"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";
import { CheckCircle } from "reicon-react/icons/CheckCircle";

const features = [
	"Unlimited images and videos",
	"Today and yesterday's page views",
	"QR code sharing",
	"Unlimited links",
	"Easy drag-and-drop page editing",
	"Separate desktop and mobile layouts",
];

export default function FeatureListSection({
	joinButton,
}: {
	joinButton: ReactNode;
}) {
	const reduceMotion = useReducedMotion();
	const entrance = {
		hidden: { opacity: 0, y: reduceMotion ? 0 : 12 },
		visible: {
			opacity: 1,
			y: 0,
			transition: {
				duration: reduceMotion ? 0 : 0.45,
				ease: [0.23, 1, 0.32, 1] as const,
			},
		},
	};
	const listEntrance = {
		hidden: {},
		visible: {
			transition: {
				delayChildren: reduceMotion ? 0 : 0.08,
				staggerChildren: reduceMotion ? 0 : 0.05,
			},
		},
	};

	return (
		<section
			aria-labelledby="landing-features-title"
			className="w-full px-6 py-20 sm:px-10 sm:py-28"
		>
			<div className="mx-auto flex w-full max-w-5xl flex-col items-center gap-30">
				<motion.h2
					id="landing-features-title"
					className="text-pretty text-center font-medium text-3xl text-foreground leading-tight tracking-[-0.065em] sm:text-4xl lg:text-5xl"
					initial={reduceMotion ? false : "hidden"}
					whileInView="visible"
					viewport={{ once: true, amount: 0.6 }}
					variants={entrance}
				>
					More built in, ready to share.
				</motion.h2>
				<div className="relative isolate w-full max-w-[26rem]">
					<img
						aria-hidden="true"
						alt=""
						src="/images/landing/features-flower.png"
						className="pointer-events-none absolute -top-16 left-1/2 z-20 w-48 -translate-x-1/2"
					/>
					<div className="smooth-shadow-ring-sm relative z-10 flex min-h-[26rem] flex-col justify-center gap-6 rounded-[2rem] bg-background px-6 pt-16 pb-6">
						<motion.ul
							className="flex flex-col gap-5 p-2 font-medium!"
							initial={reduceMotion ? false : "hidden"}
							whileInView="visible"
							viewport={{ once: true, amount: 0.3 }}
							variants={listEntrance}
						>
							{features.map((feature) => (
								<motion.li
									key={feature}
									className="flex flex-row items-center gap-3"
									variants={entrance}
								>
									<CheckCircle
										aria-hidden="true"
										weight="Filled"
										className="size-5 shrink-0 text-brand-green"
									/>
									<span className="text-base text-foreground sm:text-lg">
										{feature}
									</span>
								</motion.li>
							))}
						</motion.ul>
						<p className="text-pretty text-center text-muted-foreground text-sm leading-relaxed">
							Even if we introduce paid plans, we’ll keep these features free as
							long as we can sustainably support them.
						</p>
						{joinButton}
					</div>
				</div>
			</div>
		</section>
	);
}
