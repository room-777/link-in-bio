"use client";

import type { PageByHandleResponse } from "@grabbin/api";
import { motion, useReducedMotion } from "motion/react";
import dynamic from "next/dynamic";
import { toBentoItem } from "@/lib/bento/bento-batch";
import { getMediaCropStyle } from "@/lib/bento/media-crop";
import { getPageImageUrl } from "@/lib/page-image-url";
import PageFooter from "./page-footer";

const BentoSection = dynamic(() => import("./bento-section"), { ssr: false });

export default function HandlePage({
	pageResponse,
}: {
	pageResponse: PageByHandleResponse;
}) {
	const { page } = pageResponse;
	const title = page.name?.trim() || `@${page.handle}`;
	const imageUrl = getPageImageUrl(page.imageSource ?? page.imageKey, {
		width: 1024,
		height: 1024,
		format: "auto",
		fit: "scale-down",
	});
	const imageStyle = page.imageCrop
		? getMediaCropStyle(page.imageCrop)
		: undefined;
	const reduceMotion = useReducedMotion();
	const enterTransition = reduceMotion
		? { duration: 0 }
		: { duration: 0.85, ease: [0.22, 1, 0.36, 1] as const };

	return (
		<main className="page-scroll-container no-scrollbar relative box-border min-h-dvh w-full overflow-y-auto bg-background min-[90rem]:flex min-[90rem]:h-dvh min-[90rem]:items-start min-[90rem]:justify-center">
			<div className="flex w-full flex-col items-center gap-8 min-[90rem]:min-h-dvh min-[90rem]:flex-row min-[90rem]:items-stretch min-[90rem]:justify-around">
				<div className="contents w-full min-w-0 max-w-md min-[90rem]:flex min-[90rem]:min-h-0 min-[90rem]:w-2xl min-[90rem]:max-w-none min-[90rem]:flex-col">
					<article className="order-1 flex min-h-0 w-full max-w-md flex-1 flex-col gap-8 p-6 px-12 pt-12 min-[90rem]:sticky min-[90rem]:top-0 min-[90rem]:min-h-dvh min-[90rem]:max-w-none min-[90rem]:flex-none min-[90rem]:self-start min-[90rem]:pt-16">
						<div className="relative flex size-28 items-center justify-center overflow-hidden rounded-full sm:size-32 min-[90rem]:size-46">
							{imageUrl && (
								<motion.img
									src={imageUrl}
									alt={title}
									initial={reduceMotion ? false : { opacity: 0, rotate: -8 }}
									animate={{ opacity: 1, rotate: 0 }}
									transition={enterTransition}
									className="size-full rounded-lg object-cover"
									style={imageStyle}
								/>
							)}
						</div>
						<div className="flex min-w-0 flex-col gap-2 min-[90rem]:px-2">
							<motion.h1
								initial={reduceMotion ? false : { opacity: 0, y: 10 }}
								animate={{ opacity: 1, y: 0 }}
								transition={{ ...enterTransition, delay: 0.08 }}
								className="font-bold text-3xl leading-tight tracking-tight min-[90rem]:text-[40px]"
							>
								{title}
							</motion.h1>
							{page.bio?.trim() && (
								<motion.p
									initial={reduceMotion ? false : { opacity: 0, y: 10 }}
									animate={{ opacity: 1, y: 0 }}
									transition={{ ...enterTransition, delay: 0.16 }}
									className="whitespace-pre-wrap px-0.5 text-base text-primary/80 leading-6 min-[90rem]:text-xl min-[90rem]:leading-8"
								>
									{page.bio}
								</motion.p>
							)}
						</div>
					</article>
				</div>
				<section className="bento-content-scroll-shell no-scrollbar order-2 min-h-[calc(100dvh-3rem)] w-full overflow-visible p-0 pt-0 sm:max-w-md min-[90rem]:order-none min-[90rem]:h-full min-[90rem]:min-h-[calc(100dvh-4rem)] min-[90rem]:w-4xl min-[90rem]:max-w-none min-[90rem]:shrink-0 min-[90rem]:pt-16 min-[90rem]:pb-24">
					<div className="flex flex-col gap-4">
						<BentoSection items={pageResponse.items.map(toBentoItem)} />
					</div>
				</section>
			</div>
			<PageFooter handle={page.handle} isOwner={page.isOwner} />
		</main>
	);
}
