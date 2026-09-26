"use client";

import type { PageByHandleResponse } from "@grabbin/api";
import {
	type BentoBreakpoint,
	getBentoWidth,
	getColumns,
} from "@grabbin/bento-layout";
import { motion, useReducedMotion } from "motion/react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { useEffect, useState } from "react";
import { toBentoItem } from "@/lib/bento/bento-batch";
import { getMediaCropStyle } from "@/lib/bento/media-crop";
import { getPageImageUrl } from "@/lib/page-image-url";
import PageFooter from "./page-footer";
import SimpleAnalyticsTracker from "./simple-analytics-tracker";

const BentoSection = dynamic(() => import("./bento-section"), { ssr: false });
const MotionImage = motion.create(Image);
const PROFILE_ENTER_DURATION_SECONDS = 0.85;
const PROFILE_TITLE_ENTER_DELAY_SECONDS = 0.08;
const PROFILE_BIO_ENTER_DELAY_SECONDS = 0.16;

export default function HandlePage({
	pageResponse,
}: {
	pageResponse: PageByHandleResponse;
}) {
	const { page } = pageResponse;
	const title = page.name?.trim() || `@${page.handle}`;
	const bio = page.bio?.trim();
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
	const [profileBreakpoint, setProfileBreakpoint] =
		useState<BentoBreakpoint>("compact");
	const compactProfileMaxWidth = `calc(${getBentoWidth(getColumns("compact"))}px + 3rem)`;
	const enterTransition = reduceMotion
		? { duration: 0 }
		: {
				duration: PROFILE_ENTER_DURATION_SECONDS,
				ease: [0.22, 1, 0.36, 1] as const,
			};
	const [profileEntryComplete, setProfileEntryComplete] = useState(false);
	useEffect(() => {
		const mediaQuery = window.matchMedia("(min-width: 90rem)");
		const syncBreakpoint = () =>
			setProfileBreakpoint(mediaQuery.matches ? "wide" : "compact");
		syncBreakpoint();
		mediaQuery.addEventListener("change", syncBreakpoint);
		return () => mediaQuery.removeEventListener("change", syncBreakpoint);
	}, []);
	return (
		<main className="page-scroll-container no-scrollbar relative box-border flex h-dvh min-h-0 w-full flex-col items-center overflow-y-auto overscroll-y-none bg-background min-[90rem]:items-start min-[90rem]:justify-center">
			<SimpleAnalyticsTracker pageId={page.id} />
			<div className="flex w-full flex-col items-center gap-8 min-[90rem]:min-h-dvh min-[90rem]:flex-row min-[90rem]:items-stretch min-[90rem]:justify-around">
				<div className="contents w-full min-w-0 max-w-md min-[90rem]:flex min-[90rem]:min-h-0 min-[90rem]:w-2xl min-[90rem]:max-w-none min-[90rem]:flex-col">
					<article
						className="order-1 flex min-h-0 w-full max-w-md flex-1 flex-col gap-8 p-6 px-6 pt-12 min-[90rem]:fixed min-[90rem]:top-0 min-[90rem]:min-h-dvh min-[90rem]:max-w-none min-[90rem]:flex-none min-[90rem]:self-start min-[90rem]:px-12 min-[90rem]:pt-16"
						style={
							profileBreakpoint === "wide"
								? { width: "min(42rem, calc(100vw - 58rem))" }
								: { maxWidth: compactProfileMaxWidth }
						}
					>
						<div className="relative flex size-28 items-center justify-center overflow-hidden rounded-full sm:size-32 min-[90rem]:size-46">
							{imageUrl && (
								<MotionImage
									fill
									src={imageUrl}
									alt={title}
									sizes="(min-width: 90rem) 184px, 128px"
									initial={reduceMotion ? false : { opacity: 0, rotate: -8 }}
									animate={{ opacity: 1, rotate: 0 }}
									transition={enterTransition}
									className="size-full rounded-lg object-cover"
									style={imageStyle}
								/>
							)}
							{imageUrl && (
								<span
									aria-hidden="true"
									className="pointer-events-none absolute inset-0 z-10 rounded-full outline-depth"
								/>
							)}
						</div>
						<div className="flex min-w-0 flex-col gap-2">
							<motion.h1
								initial={reduceMotion ? false : { opacity: 0, y: 10 }}
								animate={{ opacity: 1, y: 0 }}
								transition={{
									...enterTransition,
									delay: PROFILE_TITLE_ENTER_DELAY_SECONDS,
								}}
								onAnimationComplete={
									bio ? undefined : () => setProfileEntryComplete(true)
								}
								className="break-words font-bold text-3xl leading-tight tracking-tight min-[90rem]:text-[40px]"
							>
								{title}
							</motion.h1>
							{bio && (
								<motion.p
									initial={reduceMotion ? false : { opacity: 0, y: 10 }}
									animate={{ opacity: 1, y: 0 }}
									transition={{
										...enterTransition,
										delay: PROFILE_BIO_ENTER_DELAY_SECONDS,
									}}
									onAnimationComplete={() => setProfileEntryComplete(true)}
									className="whitespace-pre-wrap px-0.5 text-base text-primary/80 leading-6 min-[90rem]:text-xl min-[90rem]:leading-8"
								>
									{page.bio}
								</motion.p>
							)}
						</div>
					</article>
				</div>
				<section className="bento-content-scroll-shell no-scrollbar order-2 min-h-[calc(100dvh-3rem)] w-full max-w-md overflow-visible px-6 pt-0 min-[90rem]:order-none min-[90rem]:h-full min-[90rem]:min-h-[calc(100dvh-4rem)] min-[90rem]:w-4xl min-[90rem]:max-w-none min-[90rem]:shrink-0 min-[90rem]:px-0 min-[90rem]:pt-16 min-[90rem]:pb-24">
					<div className="flex flex-col gap-4">
						<BentoSection
							items={pageResponse.items.map(toBentoItem)}
							entryReady={reduceMotion || profileEntryComplete}
						/>
					</div>
				</section>
			</div>
			<PageFooter handle={page.handle} isOwner={page.isOwner} />
		</main>
	);
}
