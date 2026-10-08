"use client";

import type { CalendlyEventType } from "@grabbin/api";
import type { LinkProviderId } from "@grabbin/page-link";
import { providerDefinitions } from "@grabbin/page-link";
import { Button } from "@grabbin/ui/components/button";
import {
	Dialog,
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
import { ChevronLeft, Search, SlidersHorizontal } from "lucide-react";
import { useReducedMotion } from "motion/react";
import { Activity, useLayoutEffect, useRef, useState } from "react";
import AdvancedWidgetActivity from "./advanced-widget-activity";
import AdvancedWidgetList from "./advanced-widget-list";

export default function AdvancedWidgetsDialog({
	onCalendlyAdd,
}: {
	onCalendlyAdd: (event: CalendlyEventType) => void;
}) {
	const isMobile = useIsMobile();
	const reduceMotion = useReducedMotion() ?? false;
	const [open, setOpen] = useState(false);
	const [providerId, setProviderId] = useState<LinkProviderId | null>(null);
	const [isDetailActivity, setIsDetailActivity] = useState(false);
	const [isTransitioning, setIsTransitioning] = useState(false);
	const [activePage, setActivePage] = useState("1");
	const [searchQuery, setSearchQuery] = useState("");
	const pageSlideRef = useRef<HTMLDivElement>(null);
	const providerDefinition = providerDefinitions.find(
		({ id }) => id === providerId,
	);

	useLayoutEffect(() => {
		if (!isTransitioning || reduceMotion || !pageSlideRef.current) return;
		void pageSlideRef.current.offsetHeight;
		setActivePage(isDetailActivity ? "2" : "1");
	}, [isDetailActivity, isTransitioning, reduceMotion]);

	const showProvider = (providerId: LinkProviderId) => {
		setProviderId(providerId);
		setIsDetailActivity(true);
		setIsTransitioning(!reduceMotion);
		if (reduceMotion) setActivePage("2");
	};

	const showCatalog = () => {
		setIsDetailActivity(false);
		setIsTransitioning(!reduceMotion);
		if (reduceMotion) {
			setActivePage("1");
			setProviderId(null);
		}
	};

	const finishTransition = (event: React.TransitionEvent<HTMLElement>) => {
		if (
			event.target === event.currentTarget &&
			event.propertyName === "transform" &&
			event.currentTarget.dataset.pageId === activePage
		) {
			setIsTransitioning(false);
			if (!isDetailActivity) setProviderId(null);
		}
	};

	const reset = () => {
		setProviderId(null);
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
							"relative z-10 -mx-3 flex h-9 shrink-0 items-center",
							!isMobile && "-mt-3",
						)}
					>
						<InputGroup className="mx-auto h-9 w-2/3 max-w-xs bg-secondary dark:bg-secondary">
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
					</header>
					<div className="min-h-0 flex-1">
						<AdvancedWidgetList
							onSelect={showProvider}
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
							{providerDefinition?.faviconUrl && (
								<img
									src={providerDefinition.faviconUrl}
									alt=""
									aria-hidden="true"
									className="size-5 shrink-0 object-contain"
								/>
							)}
							<span className="truncate">{providerDefinition?.label}</span>
						</h2>
						<Button
							type="button"
							variant="secondary"
							size="icon-lg"
							className={cn(
								"absolute top-0 z-10 rounded-full",
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
					</header>
					{providerId && (
						<div className="min-h-0 flex-1">
							<AdvancedWidgetActivity
								providerId={providerId}
								onCalendlyAdd={(event) => {
									onCalendlyAdd(event);
									handleOpenChange(false);
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
						{isDetailActivity ? providerDefinition?.label : "Advanced widgets"}
					</DrawerTitle>
				</DrawerHeader>
				<div className="min-h-0 flex-1 p-5">{content}</div>
			</DrawerContent>
		</Drawer>
	) : (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			{trigger(DialogTrigger)}
			<DialogContent
				aria-labelledby={
					isDetailActivity ? "advanced-widget-detail-title" : undefined
				}
				aria-label={!isDetailActivity ? "Advanced widgets" : undefined}
				className="aspect-square max-h-[calc(100dvh-2rem)] min-h-0 grid-rows-[minmax(0,1fr)] gap-4 p-5 pt-8 sm:max-w-lg [&_[data-slot=dialog-close]]:top-5 [&_[data-slot=dialog-close]]:right-5"
			>
				{content}
			</DialogContent>
		</Dialog>
	);
}
