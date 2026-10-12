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
import { useIsMobile } from "@grabbin/ui/components/use-mobile";
import { useReducedMotion } from "motion/react";
import { useBillingPortal } from "@/hooks/use-billing-portal";
import { useSettingsTabTransition } from "@/hooks/use-settings-tab-transition";
import { authClient } from "@/lib/auth-client";
import { isMultiPageEnabled } from "@/lib/feature-flags";
import { openPlanDialog } from "../../../billing/plan-dialog";
import { AccountTabContent } from "../account/account-tab-content";
import { BillingTabContent } from "../billing/billing-tab-content";
import CustomDomainTabContent from "../custom-domain/tab-content";
import PageTabContent from "../pages/page-tab-content";
import { SettingsTabs } from "./settings-tabs";

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
	const reduceMotion = useReducedMotion() ?? false;
	const tabsState = useSettingsTabTransition(isMultiPageEnabled, reduceMotion);
	const { isOpeningPortal, openBillingPortal } = useBillingPortal();

	const handlePlanAction = () => {
		if (!session) return;
		if (session.plan.tier === "free") openPlanDialog();
		else void openBillingPortal();
	};

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
								active={open && tabsState.activeTab === "page"}
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
					onPlanAction={handlePlanAction}
				/>
			),
		},
		{
			value: "custom-domain",
			label: "Custom domain",
			content: (
				<CustomDomainTabContent
					active={open && tabsState.activeTab === "custom-domain"}
					handle={handle}
					isPro={isPro}
					onUpgrade={openPlanDialog}
				/>
			),
		},
	];

	const content = (
		<div className="flex min-h-0 min-w-0 flex-1 flex-col gap-5">
			<SettingsTabs
				tabs={tabs}
				activeTab={tabsState.activeTab}
				activePage={tabsState.activePage}
				isTransitioning={tabsState.isTransitioning}
				outgoingTab={tabsState.outgoingTab}
				onChangeTab={tabsState.changeTab}
				onTransitionEnd={tabsState.finishTransition}
				getPageId={tabsState.getPageId}
			/>
		</div>
	);

	if (isMobile) {
		return (
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
		);
	}

	return (
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
	);
}
