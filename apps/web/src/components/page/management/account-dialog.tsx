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
import { toast } from "@grabbin/ui/components/toast";
import { useIsMobile } from "@grabbin/ui/components/use-mobile";
import { useState } from "react";
import { CheckCircle } from "reicon-react/icons/CheckCircle";
import { Verified } from "reicon-react/icons/Verified";
import { authClient } from "@/lib/auth-client";
import { PlanDialog } from "../../billing/plan-dialog";

export default function AccountDialog({
	open,
	onOpenChange,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	const isMobile = useIsMobile();
	const { data: session } = authClient.useSession();
	const isPro = session?.plan.tier === "pro";
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
	const content = (
		<div className="flex min-h-0 flex-col gap-12">
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
			<section className="flex items-center justify-between gap-4">
				<div>
					<h2 className="font-medium text-base">Plan</h2>
					<p className="text-muted-foreground text-sm">
						{session?.plan.tier === "pro" ? "Pro" : "Free"}
					</p>
				</div>
				<Button
					variant="outline"
					size={"default"}
					disabled={isOpeningPortal || !session}
					onClick={() => void handlePlanAction()}
					className={"rounded-md"}
				>
					{isOpeningPortal
						? "Opening…"
						: session?.plan.tier === "pro"
							? "Manage plan"
							: "Upgrade"}
				</Button>
			</section>
			<Field>
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
						className="text-base!"
					/>
					<InputGroupAddon align="inline-end" className="pr-2">
						<InputGroupButton
							disabled={!isPro}
							variant="outline"
							className={
								"h-9 rounded-md px-3 text-primary hover:bg-background hover:text-primary"
							}
						>
							Connect
						</InputGroupButton>
					</InputGroupAddon>
				</InputGroup>
			</Field>
		</div>
	);

	const dialog = isMobile ? (
		<Drawer open={open} onOpenChange={onOpenChange} showSwipeHandle>
			<DrawerContent className="max-h-[calc(100dvh-2rem)]">
				<div className="flex min-h-0 flex-col gap-5 overflow-y-auto p-5">
					<DrawerHeader className="sr-only">
						<DrawerTitle>Account</DrawerTitle>
						<DrawerDescription>Your account information.</DrawerDescription>
					</DrawerHeader>
					{content}
				</div>
			</DrawerContent>
		</Drawer>
	) : (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent
				showCloseButton={false}
				className="smooth-shadow-md gap-0 p-5 ring-0"
			>
				<div className="flex min-w-0 flex-col gap-5 p-1">
					<DialogHeader>
						<DialogTitle>Account</DialogTitle>
						<DialogDescription className={"sr-only"}>
							Your account information.
						</DialogDescription>
					</DialogHeader>
					{content}
				</div>
			</DialogContent>
		</Dialog>
	);

	return (
		<>
			{dialog}
			<PlanDialog
				open={isCheckoutDialogOpen}
				onOpenChange={setIsCheckoutDialogOpen}
			/>
		</>
	);
}
