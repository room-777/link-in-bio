"use client";

import type { PageByHandleResponse } from "@grabbin/api";
import {
	type BentoBreakpoint,
	bentoWideMediaQuery,
	getBentoWidth,
} from "@grabbin/bento-layout";
import { motion, useReducedMotion } from "motion/react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { useEffect, useState } from "react";
import { toBentoItem } from "@/lib/bento/bento-batch";
import { getMediaCropStyle } from "@/lib/bento/media-crop";
import { getPageImageUrl } from "@/lib/page-image-url";
import PageFooter, { MadeWithGrabbinBadge } from "../shared/page-footer";
import PublicShareLinkButton from "./public-share-link-button";
import SimpleAnalyticsTracker from "./simple-analytics-tracker";

const BentoSection = dynamic(() => import("../editor/bento/bento-section"), {
	ssr: false,
});
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
	const compactProfileMaxWidth = `calc(${getBentoWidth("compact")}px + 3rem)`;
	const enterTransition = reduceMotion
		? { duration: 0 }
		: {
				duration: PROFILE_ENTER_DURATION_SECONDS,
				ease: [0.22, 1, 0.36, 1] as const,
			};
	const [profileEntryComplete, setProfileEntryComplete] = useState(false);
	useEffect(() => {
		const mediaQuery = window.matchMedia(bentoWideMediaQuery);
		const syncBreakpoint = () =>
			setProfileBreakpoint(mediaQuery.matches ? "wide" : "compact");
		syncBreakpoint();
		mediaQuery.addEventListener("change", syncBreakpoint);
		return () => mediaQuery.removeEventListener("change", syncBreakpoint);
	}, []);
	return (
		<main className="page-scroll-container no-scrollbar relative box-border flex h-dvh min-h-0 w-full flex-col page-wide:items-start items-center page-wide:justify-center overflow-y-auto overscroll-y-none bg-background">
			<PublicShareLinkButton profileImageUrl={imageUrl} />
			<SimpleAnalyticsTracker pageId={page.id} />
			<div className="flex page-wide:min-h-dvh w-full page-wide:flex-row flex-col items-center page-wide:items-stretch page-wide:justify-around gap-8">
				<div className="page-wide:flex contents page-wide:min-h-0 page-wide:w-2xl w-full min-w-0 max-w-md page-wide:max-w-none page-wide:flex-col">
					<article
						className="page-wide:fixed page-wide:top-0 order-1 flex min-h-0 page-wide:min-h-dvh w-full max-w-md page-wide:max-w-none flex-1 page-wide:flex-none flex-col gap-8 page-wide:self-start p-6 page-wide:px-12 px-6 page-wide:pt-16 pt-12"
						style={
							profileBreakpoint === "wide"
								? { width: "min(42rem, calc(100vw - 58rem))" }
								: { maxWidth: compactProfileMaxWidth }
						}
					>
						<div className="flex w-full items-center page-wide:justify-start justify-between">
							<div className="relative flex page-wide:size-46 size-28 items-center justify-center overflow-hidden rounded-full sm:size-32">
								{imageUrl && (
									<MotionImage
										fill
										src={imageUrl}
										alt={title}
										sizes={`${bentoWideMediaQuery} 184px, 128px`}
										initial={reduceMotion ? false : { opacity: 0 }}
										animate={{ opacity: 1 }}
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
							<div className="page-wide:hidden">
								<MadeWithGrabbinBadge hasProAccess={page.hasProAccess} />
							</div>
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
								className="break-words font-bold page-wide:text-profile-name-desktop text-profile-name leading-tight tracking-tight"
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
									className="whitespace-pre-wrap px-0.5 page-wide:text-xl text-base text-primary/80 leading-6 page-wide:leading-8"
								>
									{page.bio}
								</motion.p>
							)}
						</div>
					</article>
				</div>
				<section className="bento-content-scroll-shell no-scrollbar order-2 page-wide:order-none page-wide:h-full min-h-[calc(100dvh-3rem)] page-wide:min-h-[calc(100dvh-4rem)] page-wide:w-4xl w-full max-w-md page-wide:max-w-none page-wide:shrink-0 overflow-visible page-wide:px-0 px-6 page-wide:pt-16 pt-0 page-wide:pb-24">
					<div className="flex flex-col gap-4">
						<BentoSection
							items={pageResponse.items.map(toBentoItem)}
							entryReady={reduceMotion || profileEntryComplete}
						/>
					</div>
				</section>
			</div>
			<PageFooter
				handle={page.handle}
				isOwner={page.isOwner}
				hasProAccess={page.hasProAccess}
			/>
		</main>
	);
}
