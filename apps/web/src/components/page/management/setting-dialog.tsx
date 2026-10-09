"use client";

import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@grabbin/ui/components/dialog";
import {
	Drawer,
	DrawerContent,
	DrawerDescription,
	DrawerHeader,
	DrawerTitle,
} from "@grabbin/ui/components/drawer";
import { Tabs, TabsList, TabsTrigger } from "@grabbin/ui/components/tabs";
import { toast } from "@grabbin/ui/components/toast";
import { useIsMobile } from "@grabbin/ui/components/use-mobile";
import { useReducedMotion } from "motion/react";
import { overlay } from "overlay-kit";
import { Activity, useLayoutEffect, useRef, useState } from "react";
import { authClient } from "@/lib/auth-client";
import { isMultiPageEnabled } from "@/lib/feature-flags";
import { openPlanDialog } from "../../billing/plan-dialog";
import { AccountTabContent } from "./account-tab-content";
import { BillingTabContent } from "./billing-tab-content";
import CustomDomainTabContent from "./custom-domain-tab-content";
import PageTabContent from "./page-tab-content";

export default function SettingDialog({
	open,
	onOpenChange,
	onOpenChangeComplete,
	handle,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onOpenChangeComplete: (open: boolean) => void;
	handle?: string;
}) {
	const isMobile = useIsMobile();
	const { data: session } = authClient.useSession();
	const isPro = session?.plan.tier === "pro";
	const [activeTab, setActiveTab] = useState("account");
	const [outgoingTab, setOutgoingTab] = useState<string | null>(null);
	const [isTransitioning, setIsTransitioning] = useState(false);
	const [activePage, setActivePage] = useState("1");
	const [isOpeningPortal, setIsOpeningPortal] = useState(false);
	const reduceMotion = useReducedMotion() ?? false;
	const pageSlideRef = useRef<HTMLDivElement>(null);
	const tabOrder = isMultiPageEnabled
		? ["account", "page", "billing", "custom-domain"]
		: ["account", "billing", "custom-domain"];
	const isMovingForward =
		tabOrder.indexOf(activeTab) > tabOrder.indexOf(outgoingTab ?? "account");
	const incomingPage = isMovingForward ? "2" : "1";
	const outgoingPage = incomingPage === "2" ? "1" : "2";

	useLayoutEffect(() => {
		if (!isTransitioning || reduceMotion || !pageSlideRef.current) return;
		void pageSlideRef.current.offsetHeight;
		setActivePage(incomingPage);
	}, [incomingPage, isTransitioning, reduceMotion]);

	const changeTab = (value: string | number) => {
		const nextTab = String(value);
		if (nextTab === activeTab || !tabOrder.includes(nextTab)) return;
		const movingForward =
			tabOrder.indexOf(nextTab) > tabOrder.indexOf(activeTab);
		setOutgoingTab(activeTab);
		setActiveTab(nextTab);
		setIsTransitioning(!reduceMotion);
		setActivePage(
			reduceMotion ? (movingForward ? "2" : "1") : movingForward ? "1" : "2",
		);
		if (reduceMotion) setOutgoingTab(null);
	};

	const finishTransition = (event: React.TransitionEvent<HTMLElement>) => {
		if (
			event.target === event.currentTarget &&
			event.propertyName === "transform" &&
			event.currentTarget.dataset.pageId === activePage
		) {
			setIsTransitioning(false);
			setOutgoingTab(null);
		}
	};

	const handlePlanAction = async () => {
		if (!session) return;
		if (session.plan.tier === "free") {
			openPlanDialog();
			return;
		}

		setIsOpeningPortal(true);
		try {
			const { data, error } = await authClient.creem.createPortal();
			if (error) throw new Error(error.message);
			if (data?.url) window.location.assign(data.url);
			else throw new Error("Could not open the plan portal. Please try again.");
		} catch (error) {
			toast({
				message:
					error instanceof Error
						? error.message
						: "Could not open the plan portal. Please try again.",
				state: "error",
			});
			setIsOpeningPortal(false);
		}
	};
	const tabTriggerClassName =
		"min-w-0 py-2.5 bg-background hover:bg-muted/80 hover:text-[var(--tabs-text-muted)] data-active:bg-background data-active:text-foreground data-active:hover:bg-muted/80 data-active:hover:text-foreground data-active:smooth-shadow-xs data-active:border data-active:border-border group-data-[size=xl]/tabs-list:px-1 group-data-[size=xl]/tabs-list:text-sm md:group-data-[size=xl]/tabs-list:px-2 md:group-data-[size=xl]/tabs-list:text-base";
	const tabs = [
		{
			value: "account",
			label: "Account",
			content: (
				<AccountTabContent
					email={session?.user.email}
					isPro={isPro}
					onUpgrade={openPlanDialog}
				/>
			),
		},
		...(isMultiPageEnabled
			? [
					{
						value: "page",
						label: "Page",
						content: (
							<PageTabContent
								active={open && activeTab === "page"}
								onClose={() => onOpenChange(false)}
							/>
						),
					},
				]
			: []),
		{
			value: "billing",
			label: "Billing",
			content: (
				<BillingTabContent
					isPro={isPro}
					disabled={!session}
					isOpeningPortal={isOpeningPortal}
					onPlanAction={() => void handlePlanAction()}
				/>
			),
		},
		{
			value: "custom-domain",
			label: "Custom domain",
			content: (
				<CustomDomainTabContent
					active={open && activeTab === "custom-domain"}
					handle={handle}
					isPro={isPro}
					onUpgrade={openPlanDialog}
				/>
			),
		},
	];

	const content = (
		<div className="flex min-h-0 min-w-0 flex-1 flex-col gap-5">
			<Tabs
				value={activeTab}
				onValueChange={changeTab}
				className="flex min-h-0 min-w-0 flex-1 flex-col gap-4"
			>
				<TabsList
					aria-label="Settings"
					variant="line"
					size="xl"
					className={`grid w-full max-w-full shrink-0 ${isMultiPageEnabled ? "grid-cols-[repeat(4,auto)]" : "grid-cols-[repeat(3,auto)]"} items-center justify-stretch gap-1 overflow-visible bg-background px-0 [&>[data-slot=tabs-indicator]]:hidden`}
				>
					{tabs.map((tab) => (
						<TabsTrigger
							key={tab.value}
							id={`settings-tab-${tab.value}`}
							aria-controls={`settings-panel-${tab.value}`}
							className={tabTriggerClassName}
							value={tab.value}
						>
							{tab.label}
						</TabsTrigger>
					))}
				</TabsList>
				<div className="-mx-3 min-h-0 min-w-0 flex-1 px-4">
					<div
						ref={pageSlideRef}
						className="t-page-slide relative h-full min-h-0"
						data-page={activePage}
					>
						{tabs.map((tab) => {
							const isActive = tab.value === activeTab;
							const isOutgoing = isTransitioning && tab.value === outgoingTab;
							const pageId = isTransitioning
								? isActive
									? incomingPage
									: outgoingPage
								: isActive
									? activePage
									: activePage === "1"
										? "2"
										: "1";

							return (
								<Activity
									key={tab.value}
									mode={isActive || isOutgoing ? "visible" : "hidden"}
								>
									<section
										id={`settings-panel-${tab.value}`}
										role="tabpanel"
										aria-labelledby={`settings-tab-${tab.value}`}
										aria-hidden={!isActive}
										inert={!isActive}
										className={`t-page flex h-full flex-col overflow-y-auto ${tab.value === "custom-domain" ? "p-1" : ""}`}
										data-page-id={pageId}
										onTransitionEnd={finishTransition}
									>
										{tab.content}
									</section>
								</Activity>
							);
						})}
					</div>
				</div>
			</Tabs>
		</div>
	);

	return (
		<>
			{isMobile ? (
				<Drawer
					open={open}
					onOpenChange={onOpenChange}
					onOpenChangeComplete={onOpenChangeComplete}
					showSwipeHandle
				>
					<DrawerContent className="h-[min(44rem,calc(100dvh-2rem))] max-h-[calc(100dvh-2rem)]">
						<div className="flex min-h-0 flex-1 flex-col gap-5 p-5">
							<DrawerHeader className="sr-only">
								<DrawerTitle>Settings</DrawerTitle>
								<DrawerDescription>
									Manage your account and page settings.
								</DrawerDescription>
							</DrawerHeader>
							{content}
						</div>
					</DrawerContent>
				</Drawer>
			) : (
				<Dialog
					open={open}
					onOpenChange={onOpenChange}
					onOpenChangeComplete={onOpenChangeComplete}
				>
					<DialogContent
						showCloseButton={false}
						className="smooth-shadow-md h-[min(44rem,calc(100dvh-2rem))] w-[min(40rem,calc(100vw-2rem))] max-w-md gap-0 p-5 ring-0 sm:max-w-md"
					>
						<div className="flex h-full min-h-0 min-w-0 flex-col gap-5">
							<DialogHeader className="hidden">
								<DialogTitle className="sr-only">Settings</DialogTitle>
								<DialogDescription className="sr-only">
									Manage your account and page settings.
								</DialogDescription>
							</DialogHeader>
							{content}
						</div>
					</DialogContent>
				</Dialog>
			)}
		</>
	);
}

export function openSettingDialog(handle?: string) {
	overlay.open(({ isOpen, close, unmount }) => (
		<SettingDialog
			handle={handle}
			open={isOpen}
			onOpenChange={(nextOpen) => !nextOpen && close()}
			onOpenChangeComplete={(nextOpen) => !nextOpen && unmount()}
		/>
	));
}
