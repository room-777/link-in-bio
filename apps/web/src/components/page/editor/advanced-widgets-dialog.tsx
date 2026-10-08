"use client";

import type { CalendlyEventType } from "@grabbin/api";
import { Button } from "@grabbin/ui/components/button";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogTrigger,
} from "@grabbin/ui/components/dialog";
import {
	Drawer,
	DrawerContent,
	DrawerHeader,
	DrawerTitle,
	DrawerTrigger,
} from "@grabbin/ui/components/drawer";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupInput,
} from "@grabbin/ui/components/input-group";
import { useIsMobile } from "@grabbin/ui/components/use-mobile";
import { cn } from "@grabbin/ui/lib/utils";
import { ChevronLeft, Search, SlidersHorizontal, XIcon } from "lucide-react";
import { useReducedMotion } from "motion/react";
import { Activity, useLayoutEffect, useRef, useState } from "react";
import { advancedWidgetModules } from "@/constant/widget/advanced-widget-registry";
import AdvancedWidgetActivity from "./advanced-widget-activity";
import AdvancedWidgetList from "./advanced-widget-list";
import { AdvancedWidgetIcon } from "./advanced-widget-visuals";

export default function AdvancedWidgetsDialog({
	onCalendlyAdd,
	onRssFeedAdd,
}: {
	onCalendlyAdd: (event: CalendlyEventType) => Promise<void>;
	onRssFeedAdd: (url: string) => Promise<boolean>;
}) {
	const isMobile = useIsMobile();
	const reduceMotion = useReducedMotion() ?? false;
	const [open, setOpen] = useState(false);
	const [widgetId, setWidgetId] = useState<string | null>(null);
	const [isDetailActivity, setIsDetailActivity] = useState(false);
	const [isTransitioning, setIsTransitioning] = useState(false);
	const [activePage, setActivePage] = useState("1");
	const [searchQuery, setSearchQuery] = useState("");
	const pageSlideRef = useRef<HTMLDivElement>(null);
	const selectedWidget = advancedWidgetModules.find(
		({ id }) => id === widgetId,
	);

	useLayoutEffect(() => {
		if (!isTransitioning || reduceMotion || !pageSlideRef.current) return;
		void pageSlideRef.current.offsetHeight;
		setActivePage(isDetailActivity ? "2" : "1");
	}, [isDetailActivity, isTransitioning, reduceMotion]);

	const showWidget = (widgetId: string) => {
		setWidgetId(widgetId);
		setIsDetailActivity(true);
		setIsTransitioning(!reduceMotion);
		if (reduceMotion) setActivePage("2");
	};

	const showCatalog = () => {
		setIsDetailActivity(false);
		setIsTransitioning(!reduceMotion);
		if (reduceMotion) {
			setActivePage("1");
			setWidgetId(null);
		}
	};

	const finishTransition = (event: React.TransitionEvent<HTMLElement>) => {
		if (
			event.target === event.currentTarget &&
			event.propertyName === "transform" &&
			event.currentTarget.dataset.pageId === activePage
		) {
			setIsTransitioning(false);
			if (!isDetailActivity) setWidgetId(null);
		}
	};

	const reset = () => {
		setWidgetId(null);
		setIsDetailActivity(false);
		setIsTransitioning(false);
		setActivePage("1");
		setSearchQuery("");
	};
	const handleOpenChange = (nextOpen: boolean) => {
		setOpen(nextOpen);
		if (!nextOpen) reset();
	};

	const trigger = (Trigger: typeof DialogTrigger | typeof DrawerTrigger) => (
		<Trigger
			render={
				<Button
					type="button"
					variant="ghost"
					size="icon"
					className="size-9"
					aria-label="Advanced"
					title="Advanced"
				/>
			}
		>
			<SlidersHorizontal className="size-4" aria-hidden="true" />
		</Trigger>
	);
	const dialogCloseButton = () =>
		!isMobile ? (
			<DialogClose
				render={
					<Button
						variant="secondary"
						size="icon-lg"
						className="absolute top-1/2 right-2.5 z-10 -translate-y-1/2 rounded-full"
					/>
				}
			>
				<XIcon
					className="size-5 stroke-[2.5] text-muted-foreground/80"
					aria-hidden="true"
				/>
				<span className="sr-only">Close</span>
			</DialogClose>
		) : null;

	const content = (
		<div
			ref={pageSlideRef}
			className="t-page-slide relative h-full min-h-0"
			data-page={activePage}
		>
			<Activity
				mode={!isDetailActivity || isTransitioning ? "visible" : "hidden"}
			>
				<section
					className="t-page flex flex-col gap-4"
					data-page-id="1"
					aria-hidden={isDetailActivity}
					inert={isDetailActivity}
					onTransitionEnd={finishTransition}
				>
					<header
						className={cn(
							"relative z-10 -mx-3 flex h-10 shrink-0 items-center",
							!isMobile && "-mt-3",
						)}
					>
						<InputGroup className="mx-auto h-10 w-2/3 max-w-xs bg-secondary dark:bg-secondary">
							<InputGroupAddon align="inline-start">
								<Search className="size-4" aria-hidden="true" />
							</InputGroupAddon>
							<InputGroupInput
								aria-label="Search widgets"
								placeholder="Search widgets"
								value={searchQuery}
								onChange={(event) => setSearchQuery(event.target.value)}
								className="h-full text-sm"
							/>
						</InputGroup>
						{dialogCloseButton()}
					</header>
					<div className="min-h-0 flex-1">
						<AdvancedWidgetList
							onSelect={showWidget}
							searchQuery={searchQuery}
						/>
					</div>
				</section>
			</Activity>
			<Activity
				mode={isDetailActivity || isTransitioning ? "visible" : "hidden"}
			>
				<section
					className="t-page flex flex-col gap-4"
					data-page-id="2"
					aria-hidden={!isDetailActivity}
					inert={!isDetailActivity}
					onTransitionEnd={finishTransition}
				>
					<header
						className={cn(
							"relative z-10 -mx-3 flex h-10 shrink-0 items-center justify-center",
							!isMobile && "-mt-3",
						)}
					>
						<h2
							id="advanced-widget-detail-title"
							className="flex min-w-0 items-center justify-center gap-2 px-12 text-center font-heading font-medium text-base leading-normal"
						>
							{selectedWidget && (
								<AdvancedWidgetIcon
									widget={selectedWidget}
									className="size-5"
								/>
							)}
							<span className="truncate">{selectedWidget?.label}</span>
						</h2>
						<Button
							type="button"
							variant="secondary"
							size="icon-lg"
							className={cn(
								"absolute top-1/2 z-10 -translate-y-1/2 rounded-full",
								isMobile ? "left-2" : "left-3",
							)}
							aria-label="Back to widgets"
							title="Back to widgets"
							onClick={showCatalog}
						>
							<ChevronLeft
								className="size-5 stroke-[2.5] text-muted-foreground/80"
								aria-hidden="true"
							/>
						</Button>
						{dialogCloseButton()}
					</header>
					{widgetId && (
						<div className="min-h-0 flex-1">
							<AdvancedWidgetActivity
								widgetId={widgetId}
								onCalendlyAdd={async (event) => {
									await onCalendlyAdd(event);
									handleOpenChange(false);
								}}
								onRssFeedAdd={async (url) => {
									const added = await onRssFeedAdd(url);
									if (added) handleOpenChange(false);
									return added;
								}}
							/>
						</div>
					)}
				</section>
			</Activity>
		</div>
	);

	return isMobile ? (
		<Drawer open={open} onOpenChange={handleOpenChange} showSwipeHandle>
			{trigger(DrawerTrigger)}
			<DrawerContent
				aria-labelledby={
					isDetailActivity ? "advanced-widget-detail-title" : undefined
				}
				aria-label={!isDetailActivity ? "Advanced widgets" : undefined}
				className="h-[min(calc(100vw-2rem),calc(100dvh-2rem))] max-h-[calc(100dvh-2rem)]"
			>
				<DrawerHeader className="sr-only">
					<DrawerTitle>
						{isDetailActivity ? selectedWidget?.label : "Advanced widgets"}
					</DrawerTitle>
				</DrawerHeader>
				<div className="min-h-0 flex-1 p-5">{content}</div>
			</DrawerContent>
		</Drawer>
	) : (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			{trigger(DialogTrigger)}
			<DialogContent
				showCloseButton={false}
				aria-labelledby={
					isDetailActivity ? "advanced-widget-detail-title" : undefined
				}
				aria-label={!isDetailActivity ? "Advanced widgets" : undefined}
				className="aspect-square max-h-[calc(100dvh-2rem)] min-h-0 grid-rows-[minmax(0,1fr)] gap-4 p-5 pt-8 sm:max-w-lg"
			>
				{content}
			</DialogContent>
		</Dialog>
	);
}
