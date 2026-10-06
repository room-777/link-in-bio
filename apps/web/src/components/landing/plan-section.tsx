"use client";

import { motion, useReducedMotion } from "motion/react";
import Image from "next/image";
import { PlanPicker } from "@/components/billing/plan-dialog";

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

	return (
		<section
			aria-labelledby="landing-plan-title"
			className="w-full px-6 py-24 sm:px-10 sm:py-32"
		>
			<div className="mx-auto flex w-full max-w-5xl flex-col items-center gap-10 sm:gap-14">
				<motion.div
					className="flex flex-col items-center gap-5 text-center"
					initial={initial}
					whileInView={animate}
					viewport={viewport}
					transition={transition}
				>
					<h2
						id="landing-plan-title"
						className="max-w-lg text-balance text-center font-medium text-4xl leading-11 tracking-tighter"
					>
						A thoughtful page, free to start.
					</h2>
					<p className="w-full max-w-md text-center font-medium text-lg/6 text-muted-foreground">
						Build for free. Move to Pro to remove the watermark or connect a
						custom domain.
					</p>
				</motion.div>
				<div className="relative mx-auto mt-8 w-full max-w-sm">
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
							loading="lazy"
							quality={55}
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
