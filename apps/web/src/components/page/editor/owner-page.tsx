"use client";

import type { PageByHandleResponse } from "@grabbin/api";
import {
	type BentoBreakpoint,
	bentoWideMediaQuery,
	getBentoWidth,
} from "@grabbin/bento-layout";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getPageImageUrl } from "@/lib/page-image-url";
import PageProfileForm from "../profile/page-profile-form";
import PageFooter from "../shared/page-footer";
import type { AddWidgetButtonProps } from "./add-widget-button";
import BentoEditor from "./bento-editor";
import PageEditorToolbar from "./page-editor-toolbar";

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
	const [isBentoReady, setIsBentoReady] = useState(!demoPreview);
	const [entryAnimationRevision, setEntryAnimationRevision] = useState(0);
	const [layoutBreakpoint, setLayoutBreakpoint] =
		useState<BentoBreakpoint>("wide");
	const [viewportBreakpoint, setViewportBreakpoint] =
		useState<BentoBreakpoint>("wide");
	const [isViewportReady, setIsViewportReady] = useState(false);
	const widgetActionsRef = useRef<AddWidgetButtonProps | null>(null);
	const widgetActions = useMemo<AddWidgetButtonProps>(
		() => ({
			onItemAdd: (itemType, url) =>
				widgetActionsRef.current?.onItemAdd(itemType, url),
			onCalendlyAdd: (event) => widgetActionsRef.current?.onCalendlyAdd(event),
			onMediaSelect: (file) => widgetActionsRef.current?.onMediaSelect(file),
		}),
		[],
	);
	const handleWidgetActionsChange = useCallback(
		(actions: AddWidgetButtonProps) => {
			widgetActionsRef.current = actions;
		},
		[],
	);

	useEffect(() => {
		const mediaQuery = window.matchMedia(bentoWideMediaQuery);
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
	const handleBentoReady = useCallback(() => setIsBentoReady(true), []);
	const handleLayoutBreakpointChange = useCallback(
		(breakpoint: BentoBreakpoint) => {
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
	const compactBentoWidth = getBentoWidth("compact");
	const compactMockupMaxWidth = `calc(${compactBentoWidth}px + 5rem)`;
	const compactProfileMaxWidth = `calc(${compactBentoWidth}px + 3rem)`;
	const desktopMainClassName = `bg-background page-profile mx-auto flex min-h-svh w-full max-w-md min-w-0 flex-col justify-between gap-8 p-6 px-6 pt-12 page-wide:mx-0 page-wide:sticky page-wide:top-0 ${demoPreview ? "page-wide:h-full page-wide:min-h-0" : "page-wide:min-h-dvh"} page-wide:w-2xl page-wide:max-w-none page-wide:self-start page-wide:px-16 page-wide:pt-16`;
	const mainClassName = isCompactContentLayout
		? "flex w-full max-w-lg shrink-0 flex-col items-center justify-start overflow-visible p-6 px-6 pt-12 bg-background"
		: desktopMainClassName;
	const pageFooter = (
		<PageFooter
			handle={currentPage.handle}
			isOwner
			demoMode={demoMode}
			onHandleChange={handleChange}
		/>
	);

	return (
		<div
			className={
				demoPreview
					? `bento-page-scroll no-scrollbar relative isolate flex h-full min-h-0 w-full flex-col items-center overflow-y-auto ${isCompactPageLayout ? "" : "page-wide:flex-row page-wide:items-start page-wide:justify-around"} ${!isBentoReady ? "bg-white" : isCompactPageLayout ? "bg-muted" : ""}`
					: isCompactPageLayout
						? "bento-page-scroll relative isolate flex h-svh min-h-0 w-full flex-col items-center overflow-hidden bg-muted"
						: "bento-page-scroll isolate flex min-h-svh w-full page-wide:flex-row flex-col page-wide:items-start items-center page-wide:justify-around page-wide:overflow-visible"
			}
		>
			<div
				className={
					isCompactPageLayout
						? `smooth-shadow-ring-sm no-scrollbar mx-auto w-full max-w-lg overflow-y-auto overscroll-y-contain rounded-[3.3rem] bg-background ${isViewportCompact ? "mt-8 mb-6 h-[calc(100svh-3.5rem)]" : "mt-10 mb-32 h-[calc(100svh-10.5rem)]"} ${demoPreview && !isBentoReady ? "invisible" : ""}`
						: `contents ${demoPreview && !isBentoReady ? "invisible" : ""}`
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
							entryReady={isBentoReady}
							entryAnimationRevision={entryAnimationRevision}
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
					entryReady={isBentoReady}
					onReady={handleBentoReady}
					onGridSavingChange={setIsGridSaving}
					onWidgetActionsChange={handleWidgetActionsChange}
				/>
				{isViewportCompact && isViewportReady ? pageFooter : null}
			</div>
			{!isViewportCompact && isViewportReady ? pageFooter : null}
			<PageEditorToolbar
				value={layoutBreakpoint}
				onChange={handleLayoutBreakpointChange}
				isAutoSaving={isAutoSaving}
				profileImageUrl={profileImageUrl}
				demoPreview={demoPreview}
				widgetActions={widgetActions}
			/>
		</div>
	);
}
