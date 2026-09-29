"use client";

import { motion, useReducedMotion } from "motion/react";
import Image from "next/image";
import type { ReactNode } from "react";
import { CheckCircle } from "reicon-react/icons/CheckCircle";
import { PlanPicker } from "@/components/billing/plan-dialog";

const freeFeatures = [
	"Unlimited images and videos",
	"Today and yesterday's page views",
	"QR code sharing",
	"Unlimited links",
	"Easy drag-and-drop page editing",
	"Separate desktop and mobile layouts",
];

export default function PlanSection({
	joinButton,
	isAuthenticated,
}: {
	joinButton: ReactNode;
	isAuthenticated: boolean;
}) {
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
						watermark.
					</p>
				</motion.div>
				<div className="relative mt-8 grid w-full max-w-[51rem] grid-cols-1 gap-6 [grid-auto-rows:1fr] md:grid-cols-2">
					<motion.div
						className="relative isolate mx-auto h-full w-full max-w-sm"
						initial={reduceMotion ? false : { opacity: 0, x: -24 }}
						whileInView={{ opacity: 1, x: 0 }}
						viewport={viewport}
						transition={{ ...transition, delay: reduceMotion ? 0 : 0.1 }}
					>
						<Image
							alt=""
							aria-hidden="true"
							className="pointer-events-none absolute top-[4rem] left-[-4rem] z-0 hidden w-32 -rotate-12 md:block lg:w-48"
							height={1254}
							sizes="(min-width: 1024px) 192px, 128px"
							src="/images/landing/media-doodles-1.png"
							width={1254}
						/>
						<Image
							alt=""
							aria-hidden="true"
							className="pointer-events-none absolute -top-16 left-1/2 z-20 w-48 -translate-x-1/2"
							height={1254}
							sizes="192px"
							src="/images/landing/features-flower.png"
							width={1254}
						/>
						<div className="smooth-shadow-ring-sm relative z-10 flex h-full min-h-[26rem] flex-col justify-center gap-6 rounded-[2rem] bg-background px-6 pt-16 pb-6">
							<ul className="flex flex-col gap-5 p-2 font-medium!">
								{freeFeatures.map((feature) => (
									<li
										key={feature}
										className="flex flex-row items-center gap-3"
									>
										<CheckCircle
											aria-hidden="true"
											weight="Filled"
											className="size-5 shrink-0 text-brand-green"
										/>
										<span className="text-base text-foreground sm:text-lg">
											{feature}
										</span>
									</li>
								))}
							</ul>
							<p className="text-pretty text-center text-muted-foreground text-sm leading-relaxed">
								Even if we introduce paid plans, we’ll keep these features free
								as long as we can sustainably support them.
							</p>
							{joinButton}
						</div>
					</motion.div>
					<motion.div
						className="relative isolate mx-auto h-full w-full max-w-sm"
						initial={reduceMotion ? false : { opacity: 0, x: 24 }}
						whileInView={{ opacity: 1, x: 0 }}
						viewport={viewport}
						transition={{ ...transition, delay: reduceMotion ? 0 : 0.1 }}
					>
						<Image
							alt=""
							aria-hidden="true"
							className="pointer-events-none absolute top-[9rem] right-[-4rem] z-0 hidden w-36 rotate-12 md:block lg:w-52"
							height={1254}
							sizes="(min-width: 1024px) 208px, 144px"
							src="/images/landing/media-doodles-2.png"
							width={1254}
						/>
						<div className="relative z-10 h-full">
							<PlanPicker
								variant="default"
								className="smooth-shadow-ring-sm flex h-full min-h-[26rem] flex-col rounded-[2rem] pb-6 [&_[data-slot=button]]:mt-auto"
								isAuthenticated={isAuthenticated}
							/>
						</div>
					</motion.div>
				</div>
			</div>
		</section>
	);
}
