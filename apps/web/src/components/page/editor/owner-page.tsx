"use client";

import type { PageByHandleResponse } from "@grabbin/api";
import {
	type BentoBreakpoint,
	getBentoWidth,
	getColumns,
} from "@grabbin/bento-layout";
import { useCallback, useEffect, useState } from "react";
import { getPageImageUrl } from "@/lib/page-image-url";
import PageProfileForm from "../profile/page-profile-form";
import PageFooter from "../shared/page-footer";
import BentoEditor from "./bento-editor";
import PageLayoutPreset from "./page-layout-preset";

export default function OwnerPage({
	pageResponse,
	demoMode = false,
	demoPreview = false,
}: {
	pageResponse: PageByHandleResponse;
	demoMode?: boolean;
	demoPreview?: boolean;
}) {
	const { page } = pageResponse;
	const [currentPage, setCurrentPage] = useState(page);
	const [isSaving, setIsSaving] = useState(false);
	const [isGridSaving, setIsGridSaving] = useState(false);
	const [profileEntryComplete, setProfileEntryComplete] = useState(false);
	const [bentoEntryComplete, setBentoEntryComplete] = useState(false);
	const [entryAnimationRevision, setEntryAnimationRevision] = useState(0);
	const [layoutBreakpoint, setLayoutBreakpoint] =
		useState<BentoBreakpoint>("wide");
	const [viewportBreakpoint, setViewportBreakpoint] =
		useState<BentoBreakpoint>("wide");
	const [isViewportReady, setIsViewportReady] = useState(false);

	useEffect(() => {
		const mediaQuery = window.matchMedia("(min-width: 90rem)");
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
	const handleProfileEntryComplete = useCallback(
		() => setProfileEntryComplete(true),
		[],
	);
	const handleBentoEntryComplete = useCallback(
		() => setBentoEntryComplete(true),
		[],
	);
	const handleLayoutBreakpointChange = useCallback(
		(breakpoint: BentoBreakpoint) => {
			setProfileEntryComplete(false);
			setLayoutBreakpoint(breakpoint);
			setEntryAnimationRevision((revision) => revision + 1);
		},
		[],
	);
	const isAutoSaving = isSaving || isGridSaving;
	const profileImageUrl = getPageImageUrl(
		currentPage.imageSource ?? currentPage.imageKey,
		{ width: 256, height: 256, format: "auto", fit: "cover" },
	);
	const isViewportCompact = viewportBreakpoint === "compact";
	const effectiveBreakpoint = isViewportCompact ? "compact" : layoutBreakpoint;
	const isCompactContentLayout = effectiveBreakpoint === "compact";
	const isCompactPageLayout = layoutBreakpoint === "compact";
	const compactBentoWidth = getBentoWidth(getColumns("compact"));
	const compactMockupMaxWidth = `calc(${compactBentoWidth}px + 5rem)`;
	const compactProfileMaxWidth = `calc(${compactBentoWidth}px + 3rem)`;
	const desktopMainClassName = `page-profile mx-auto flex min-h-svh w-full max-w-md min-w-0 flex-col justify-between gap-8 p-6 px-6 pt-12 min-[90rem]:mx-0 min-[90rem]:sticky min-[90rem]:top-0 ${demoPreview ? "min-[90rem]:h-full min-[90rem]:min-h-0" : "min-[90rem]:min-h-dvh"} min-[90rem]:w-2xl min-[90rem]:max-w-none min-[90rem]:self-start min-[90rem]:px-16 min-[90rem]:pt-16`;
	const mainClassName = isCompactContentLayout
		? "flex w-full max-w-lg shrink-0 flex-col items-center justify-start overflow-visible p-6 px-6 pt-12"
		: desktopMainClassName;
	const pageFooter = (
		<PageFooter
			handle={currentPage.handle}
			isOwner
			onHandleChange={handleChange}
		/>
	);

	return (
		<div
			className={
				demoPreview
					? `bento-page-scroll no-scrollbar relative isolate flex h-full min-h-0 w-full flex-col items-center overflow-y-auto ${isCompactPageLayout ? "bg-muted" : "min-[90rem]:flex-row min-[90rem]:items-start min-[90rem]:justify-around"}`
					: isCompactPageLayout
						? "bento-page-scroll relative isolate flex h-svh min-h-0 w-full flex-col items-center overflow-hidden bg-muted"
						: "bento-page-scroll isolate flex min-h-svh w-full flex-col items-center min-[90rem]:flex-row min-[90rem]:items-start min-[90rem]:justify-around min-[90rem]:overflow-visible"
			}
		>
			<div
				className={
					isCompactPageLayout
						? `smooth-shadow-ring-sm no-scrollbar mx-auto w-full max-w-lg overflow-y-auto overscroll-y-contain rounded-[3.3rem] bg-background ${isViewportCompact ? "mt-8 mb-6 h-[calc(100svh-3.5rem)]" : "mt-10 mb-32 h-[calc(100svh-10.5rem)]"}`
						: "contents"
				}
				style={
					isCompactPageLayout ? { maxWidth: compactMockupMaxWidth } : undefined
				}
			>
				<main
					className={`${mainClassName} ${isCompactPageLayout ? "mx-auto" : ""}`}
					style={
						isCompactContentLayout
							? { maxWidth: compactProfileMaxWidth }
							: undefined
					}
				>
					<div className="w-full min-w-0">
						<PageProfileForm
							page={currentPage}
							breakpoint={effectiveBreakpoint}
							demoMode={demoMode}
							entryAnimationRevision={entryAnimationRevision}
							onEntryComplete={handleProfileEntryComplete}
							onSavingChange={setIsSaving}
						/>
					</div>
				</main>
				<BentoEditor
					items={pageResponse.items}
					handle={currentPage.handle}
					breakpoint={effectiveBreakpoint}
					demoMode={demoMode}
					isAutoSaving={isAutoSaving}
					profileImageUrl={profileImageUrl}
					entryAnimationRevision={entryAnimationRevision}
					entryReady={profileEntryComplete}
					onEntryComplete={handleBentoEntryComplete}
					onGridSavingChange={setIsGridSaving}
				/>
				{!demoMode && isViewportCompact && isViewportReady ? pageFooter : null}
			</div>
			{!demoMode && !isViewportCompact && isViewportReady ? pageFooter : null}
			{!isViewportCompact && bentoEntryComplete ? (
				<PageLayoutPreset
					value={layoutBreakpoint}
					onChange={handleLayoutBreakpointChange}
					isAutoSaving={isAutoSaving}
					profileImageUrl={profileImageUrl}
					demoPreview={demoPreview}
				/>
			) : null}
		</div>
	);
}
