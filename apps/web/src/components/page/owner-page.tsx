"use client";

import type { PageByHandleResponse } from "@grabbin/api";
import type { BentoBreakpoint } from "@grabbin/bento-layout";
import { Button } from "@grabbin/ui/components/button";
import { Laptop, Smartphone } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";

import FloatPreview from "@/components/layout/float-preview";
import BentoEditor from "./bento-editor";
import PageFooter from "./page-footer";
import PageOnboardingForm from "./page-onboarding-form";
import PageProfileForm from "./page-profile-form";

export default function OwnerPage({
	pageResponse,
}: {
	pageResponse: PageByHandleResponse;
}) {
	const { page } = pageResponse;
	const [currentPage, setCurrentPage] = useState(page);
	const [isFloatVisible, setIsFloatVisible] = useState(!page.onboarding);
	const [isSaving, setIsSaving] = useState(false);
	const [isGridSaving, setIsGridSaving] = useState(false);
	const [layoutBreakpoint, setLayoutBreakpoint] =
		useState<BentoBreakpoint>("wide");
	const [viewportBreakpoint, setViewportBreakpoint] =
		useState<BentoBreakpoint>("compact");
	const [isViewportReady, setIsViewportReady] = useState(false);
	const reduceMotion = useReducedMotion();
	const layoutTransition = reduceMotion
		? { duration: 0 }
		: { type: "spring" as const, stiffness: 560, damping: 32, mass: 0.8 };

	useEffect(() => {
		const mediaQuery = window.matchMedia("(min-width: 100rem)");
		const syncViewportBreakpoint = () => {
			const nextBreakpoint = mediaQuery.matches ? "wide" : "compact";
			setViewportBreakpoint(nextBreakpoint);
			setIsViewportReady(true);
		};
		syncViewportBreakpoint();
		mediaQuery.addEventListener("change", syncViewportBreakpoint);
		return () =>
			mediaQuery.removeEventListener("change", syncViewportBreakpoint);
	}, []);

	useEffect(() => {
		setCurrentPage(page);
	}, [page]);

	const handleChange = (handle: string) => {
		setCurrentPage((page) => ({ ...page, handle }));
		window.history.replaceState(null, "", `/${encodeURIComponent(handle)}`);
	};
	const hasCompletedOnboarding = currentPage.onboarding;
	const isViewportCompact = viewportBreakpoint === "compact";
	const effectiveBreakpoint = isViewportCompact ? "compact" : layoutBreakpoint;
	const isCompactPageLayout = effectiveBreakpoint === "compact";
	const desktopMainClassName =
		"page-profile mx-auto flex min-h-svh w-full max-w-md flex-col justify-between gap-8 p-6 px-6 pt-12 min-[100rem]:mx-0 min-[100rem]:sticky min-[100rem]:top-0 min-[100rem]:min-h-dvh min-[100rem]:w-2xl min-[100rem]:max-w-none min-[100rem]:flex-none min-[100rem]:self-start min-[100rem]:px-16 min-[100rem]:pt-16";
	const mainClassName = isCompactPageLayout
		? "flex w-full max-w-lg shrink-0 flex-col justify-start overflow-visible p-6 px-6 pt-12"
		: desktopMainClassName;
	const pageFooter = (
		<PageFooter
			handle={currentPage.handle}
			isOwner
			onHandleChange={handleChange}
			isSaving={isSaving}
		/>
	);

	return (
		<div
			className={
				isCompactPageLayout
					? "bento-page-scroll relative flex min-h-svh w-full flex-col items-center overflow-visible"
					: "bento-page-scroll flex min-h-svh w-full flex-col min-[100rem]:flex-row min-[100rem]:items-start min-[100rem]:justify-around min-[100rem]:overflow-visible"
			}
		>
			<main className={mainClassName}>
				{currentPage.onboarding ? (
					<PageProfileForm
						page={currentPage}
						mode="edit"
						breakpoint={effectiveBreakpoint}
						onSavingChange={setIsSaving}
					/>
				) : (
					<PageOnboardingForm
						page={currentPage}
						breakpoint={effectiveBreakpoint}
						onOnboardingComplete={(stage) =>
							setIsFloatVisible(stage === "complete")
						}
					/>
				)}
			</main>
			{hasCompletedOnboarding ? (
				<BentoEditor
					items={pageResponse.items}
					handle={currentPage.handle}
					breakpoint={effectiveBreakpoint}
					onGridSavingChange={setIsGridSaving}
				/>
			) : (
				<FloatPreview visible={isFloatVisible} wideOnly />
			)}
			{hasCompletedOnboarding ? (
				<>
					{isViewportReady ? pageFooter : null}
					{!isViewportCompact ? (
						<div className="smooth-shadow-ring-sm smooth-ring-neutral-300/20 pointer-events-none fixed bottom-10 left-1/2 z-[100003] flex -translate-x-1/2 items-center gap-3 rounded-lg bg-background">
							{isGridSaving ? (
								<div
									className="text-muted-foreground/80 text-xs"
									role="status"
									aria-live="polite"
								>
									Saving...
								</div>
							) : null}
							<fieldset className="pointer-events-auto relative flex items-center gap-1 p-1">
								<legend className="sr-only">Editing layout breakpoint</legend>
								<Button
									type="button"
									size="default"
									variant="ghost"
									aria-pressed={layoutBreakpoint === "compact"}
									aria-label="Edit compact layout"
									onClick={() => setLayoutBreakpoint("compact")}
									className="relative z-10 px-5 text-foreground hover:bg-transparent aria-pressed:text-primary-foreground aria-pressed:hover:text-primary-foreground"
								>
									{layoutBreakpoint === "compact" ? (
										<motion.span
											layoutId="owner-page-layout-breakpoint-selection"
											initial={false}
											transition={layoutTransition}
											aria-hidden="true"
											className="smooth-shadow-xs surface-line pointer-events-none absolute inset-0 rounded-md bg-primary"
										/>
									) : null}
									<Smartphone
										className="relative z-10 size-5"
										aria-hidden="true"
									/>
									<span className="sr-only">Compact</span>
								</Button>
								<Button
									type="button"
									size="default"
									variant="ghost"
									aria-pressed={layoutBreakpoint === "wide"}
									aria-label="Edit wide layout"
									onClick={() => setLayoutBreakpoint("wide")}
									className="relative z-10 px-5 text-foreground hover:bg-transparent aria-pressed:text-primary-foreground aria-pressed:hover:text-primary-foreground"
								>
									{layoutBreakpoint === "wide" ? (
										<motion.span
											layoutId="owner-page-layout-breakpoint-selection"
											initial={false}
											transition={layoutTransition}
											aria-hidden="true"
											className="smooth-shadow-xs surface-line pointer-events-none absolute inset-0 rounded-md bg-primary"
										/>
									) : null}
									<Laptop className="relative z-10 size-5" aria-hidden="true" />
									<span className="sr-only">Wide</span>
								</Button>
							</fieldset>
						</div>
					) : null}
				</>
			) : null}
		</div>
	);
}
