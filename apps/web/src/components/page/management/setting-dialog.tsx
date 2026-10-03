"use client";

import { Button } from "@grabbin/ui/components/button";
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
import {
	Field,
	FieldDescription,
	FieldTitle,
} from "@grabbin/ui/components/field";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupButton,
	InputGroupInput,
} from "@grabbin/ui/components/input-group";
import {
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
} from "@grabbin/ui/components/tabs";
import { toast } from "@grabbin/ui/components/toast";
import { useIsMobile } from "@grabbin/ui/components/use-mobile";
import { useState } from "react";
import { CheckCircle } from "reicon-react/icons/CheckCircle";
import { Verified } from "reicon-react/icons/Verified";
import { authClient } from "@/lib/auth-client";
import { PlanDialog } from "../../billing/plan-dialog";
import PageTabContent from "./page-tab-content";

export default function SettingDialog({
	open,
	onOpenChange,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	const isMobile = useIsMobile();
	const { data: session } = authClient.useSession();
	const isPro = session?.plan.tier === "pro";
	const [activeTab, setActiveTab] = useState("account");
	const [isCheckoutDialogOpen, setIsCheckoutDialogOpen] = useState(false);
	const [isOpeningPortal, setIsOpeningPortal] = useState(false);

	const handlePlanAction = async () => {
		if (!session) return;
		if (session.plan.tier === "free") {
			setIsCheckoutDialogOpen(true);
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
		"py-1.5 bg-background hover:bg-muted/80 hover:text-[var(--tabs-text-muted)] data-active:bg-background data-active:text-foreground data-active:hover:bg-muted/80 data-active:hover:text-foreground data-active:smooth-shadow-xs data-active:border data-active:border-border";

	const content = (
		<div className="flex min-h-0 min-w-0 flex-1 flex-col gap-5">
			<h2 className="text-center font-heading font-medium text-base">
				Setting
			</h2>
			<Tabs
				value={activeTab}
				onValueChange={(value) => setActiveTab(String(value))}
				orientation={isMobile ? "horizontal" : "vertical"}
				className={
					isMobile
						? "flex min-h-0 min-w-0 flex-1 flex-col gap-4"
						: "flex min-h-0 min-w-0 flex-1 gap-6"
				}
			>
				<TabsList
					aria-label="Settings"
					variant="line"
					size="lg"
					className={
						isMobile
							? "w-full max-w-full items-center justify-start gap-1 overflow-x-visible bg-background px-0 [&>[data-slot=tabs-indicator]]:hidden"
							: "w-36 shrink-0 items-stretch overflow-x-visible bg-background px-0 [&>[data-slot=tabs-indicator]]:hidden"
					}
				>
					<TabsTrigger className={tabTriggerClassName} value="account">
						Account
					</TabsTrigger>
					<TabsTrigger className={tabTriggerClassName} value="page">
						Page
					</TabsTrigger>
					<TabsTrigger className={tabTriggerClassName} value="billing">
						Billing
					</TabsTrigger>
					<TabsTrigger className={tabTriggerClassName} value="custom-domain">
						Custom domain
					</TabsTrigger>
				</TabsList>
				<div className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden px-1">
					<TabsContent value="account" className="m-0 h-full">
						<section className="flex min-w-0 flex-col gap-3">
							<h2 className="font-medium text-base">Your email</h2>
							<div className="flex h-11 min-w-0 items-center justify-between gap-2 rounded-lg bg-secondary p-3 pl-3.5">
								<p className="truncate text-base text-primary">
									{session?.user.email}
								</p>
								<CheckCircle
									aria-hidden="true"
									weight="Filled"
									className="size-6 shrink-0 text-brand-green"
								/>
							</div>
						</section>
					</TabsContent>
					<TabsContent value="page" className="m-0 h-full">
						<PageTabContent
							active={open && activeTab === "page"}
							onClose={() => onOpenChange(false)}
						/>
					</TabsContent>
					<TabsContent value="billing" className="m-0 h-full">
						<section className="flex items-center justify-between gap-4">
							<div>
								<h2 className="font-medium text-base">Plan</h2>
								<p className="text-muted-foreground text-sm">
									{isPro ? "Pro" : "Free"}
								</p>
							</div>
							<Button
								variant="outline"
								disabled={isOpeningPortal || !session}
								onClick={() => void handlePlanAction()}
								className="rounded-md"
							>
								{isOpeningPortal
									? "Opening…"
									: isPro
										? "Manage plan"
										: "Upgrade"}
							</Button>
						</section>
					</TabsContent>
					<TabsContent value="custom-domain" className="m-0 h-full p-1">
						<Field className="min-w-0">
							<FieldTitle className="gap-1 text-base">
								Custom domain
								<Verified
									aria-hidden="true"
									weight="Filled"
									className="size-5 text-brand-blue"
								/>
							</FieldTitle>
							<FieldDescription id="custom-domain-description">
								Connect your own domain to make your page more personal.
							</FieldDescription>
							<InputGroup className="mt-2 h-11">
								<InputGroupInput
									id="custom-domain"
									disabled={!isPro}
									aria-label="Custom domain"
									aria-describedby="custom-domain-description"
									autoComplete="url"
									inputMode="url"
									placeholder="example.com"
									className="w-0 min-w-0 text-base!"
								/>
								<InputGroupAddon align="inline-end" className="shrink-0 pr-2">
									<InputGroupButton
										disabled={!isPro}
										variant="outline"
										className="h-9 rounded-md px-3 text-primary hover:bg-background hover:text-primary"
									>
										Connect
									</InputGroupButton>
								</InputGroupAddon>
							</InputGroup>
						</Field>
					</TabsContent>
				</div>
			</Tabs>
		</div>
	);

	return (
		<>
			{isMobile ? (
				<Drawer open={open} onOpenChange={onOpenChange} showSwipeHandle>
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
				<Dialog open={open} onOpenChange={onOpenChange}>
					<DialogContent
						showCloseButton={false}
						className="smooth-shadow-md h-[min(44rem,calc(100dvh-2rem))] w-[min(40rem,calc(100vw-2rem))] max-w-none gap-0 p-5 ring-0 sm:max-w-none"
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
			<PlanDialog
				open={isCheckoutDialogOpen}
				onOpenChange={setIsCheckoutDialogOpen}
			/>
		</>
	);
}
