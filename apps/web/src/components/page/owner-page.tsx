"use client";

import type { PageByHandleResponse } from "@grabbin/api";
import type { BentoBreakpoint } from "@grabbin/bento-layout";
import { useCallback, useEffect, useState } from "react";

import BentoEditor from "./bento-editor";
import PageFooter from "./page-footer";
import PageLayoutPreset from "./page-layout-preset";
import PageProfileForm from "./page-profile-form";

export default function OwnerPage({
	pageResponse,
}: {
	pageResponse: PageByHandleResponse;
}) {
	const { page } = pageResponse;
	const [currentPage, setCurrentPage] = useState(page);
	const [isSaving, setIsSaving] = useState(false);
	const [isGridSaving, setIsGridSaving] = useState(false);
	const [profileEntryComplete, setProfileEntryComplete] = useState(false);
	const [bentoEntryComplete, setBentoEntryComplete] = useState(false);
	const [layoutBreakpoint, setLayoutBreakpoint] =
		useState<BentoBreakpoint>("wide");
	const [viewportBreakpoint, setViewportBreakpoint] =
		useState<BentoBreakpoint>("compact");
	const [isViewportReady, setIsViewportReady] = useState(false);

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
	const handleProfileEntryComplete = useCallback(
		() => setProfileEntryComplete(true),
		[],
	);
	const handleBentoEntryComplete = useCallback(
		() => setBentoEntryComplete(true),
		[],
	);
	const isAutoSaving = isSaving || isGridSaving;
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
					? "bento-page-scroll relative isolate flex min-h-svh w-full flex-col items-center overflow-visible"
					: "bento-page-scroll isolate flex min-h-svh w-full flex-col min-[100rem]:flex-row min-[100rem]:items-start min-[100rem]:justify-around min-[100rem]:overflow-visible"
			}
		>
			<main className={mainClassName}>
				<PageProfileForm
					page={currentPage}
					breakpoint={effectiveBreakpoint}
					onEntryComplete={handleProfileEntryComplete}
					onSavingChange={setIsSaving}
				/>
			</main>
			<BentoEditor
				items={pageResponse.items}
				handle={currentPage.handle}
				breakpoint={effectiveBreakpoint}
				entryReady={profileEntryComplete}
				onEntryComplete={handleBentoEntryComplete}
				onGridSavingChange={setIsGridSaving}
			/>
			{isViewportReady ? pageFooter : null}
			{!isViewportCompact && bentoEntryComplete ? (
				<PageLayoutPreset
					value={layoutBreakpoint}
					onChange={setLayoutBreakpoint}
					isAutoSaving={isAutoSaving}
				/>
			) : null}
		</div>
	);
}
