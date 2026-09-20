"use client";

import type { PageData } from "@grabbin/api";
import { motion, useReducedMotion } from "motion/react";

import { getPageImageUrl } from "@/lib/page-image-url";
import PageFooter from "./page-footer";

export default function HandlePage({ page }: { page: PageData }) {
	const reduceMotion = useReducedMotion();
	const enterTransition = reduceMotion
		? { duration: 0 }
		: { duration: 0.85, ease: [0.22, 1, 0.36, 1] as const };

	return (
		<main className="mx-auto flex min-h-svh w-full max-w-md flex-col justify-between gap-8 p-6 px-6 pt-12 min-[90rem]:mx-0 min-[90rem]:min-h-dvh min-[90rem]:max-w-2xl min-[90rem]:px-16 min-[90rem]:pt-16">
			<article className="flex min-w-0 flex-col gap-8">
				<div className="relative isolate size-28 rounded-full bg-brand-light-gray sm:size-32 min-[90rem]:size-46">
					{getPageImageUrl(page.imageKey) && (
						<motion.img
							src={getPageImageUrl(page.imageKey) ?? undefined}
							alt=""
							initial={reduceMotion ? false : { opacity: 0, rotate: -8 }}
							animate={{ opacity: 1, rotate: 0 }}
							transition={enterTransition}
							className="size-full rounded-full object-cover"
						/>
					)}
				</div>
				<div className="flex min-w-0 flex-col gap-2 min-[90rem]:px-2">
					<motion.h1
						initial={reduceMotion ? false : { opacity: 0, y: 10 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ ...enterTransition, delay: 0.08 }}
						className="field-sizing-content min-h-fit w-full overflow-hidden whitespace-pre-wrap font-bold text-3xl leading-tight tracking-tight min-[90rem]:text-[40px]"
					>
						{page.name ?? page.handle}
					</motion.h1>
					{page.bio && (
						<motion.p
							initial={reduceMotion ? false : { opacity: 0, y: 10 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ ...enterTransition, delay: 0.16 }}
							className="field-sizing-content min-h-fit w-full overflow-hidden whitespace-pre-wrap px-0.5 text-base text-primary/80 leading-6 min-[90rem]:text-xl min-[90rem]:leading-8"
						>
							{page.bio}
						</motion.p>
					)}
				</div>
			</article>
			<PageFooter handle={page.handle} isOwner={page.isOwner} />
		</main>
	);
}
