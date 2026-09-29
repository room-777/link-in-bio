"use client";

import { env } from "@grabbin/env/web";
import { Button } from "@grabbin/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@grabbin/ui/components/dialog";
import { toast } from "@grabbin/ui/components/toast";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient, getAuthErrorMessage } from "@/lib/auth-client";
import { getSignInHref } from "@/lib/auth-redirect";
import {
	type BillingPeriod,
	PlanCard,
	type PlanCardVariant,
} from "./plan-card";

export function PlanPicker({
	variant = "default",
	className,
	isAuthenticated,
}: {
	variant?: PlanCardVariant;
	className?: string;
	isAuthenticated?: boolean;
}) {
	if (isAuthenticated !== undefined) {
		return (
			<PlanPickerContent
				variant={variant}
				className={className}
				isAuthenticated={isAuthenticated}
				isPending={false}
			/>
		);
	}

	return <SessionPlanPicker variant={variant} className={className} />;
}

function SessionPlanPicker({
	variant,
	className,
}: {
	variant: PlanCardVariant;
	className?: string;
}) {
	const { data: session, isPending } = authClient.useSession();
	return (
		<PlanPickerContent
			variant={variant}
			className={className}
			isAuthenticated={Boolean(session)}
			isPending={isPending}
		/>
	);
}

function PlanPickerContent({
	variant,
	className,
	isAuthenticated,
	isPending,
}: {
	variant: PlanCardVariant;
	className?: string;
	isAuthenticated: boolean;
	isPending: boolean;
}) {
	const router = useRouter();
	const [isLoading, setIsLoading] = useState(false);

	const choosePlan = async (plan: BillingPeriod) => {
		if (!isAuthenticated) {
			router.push(getSignInHref(window.location.pathname));
			return;
		}

		setIsLoading(true);
		try {
			const productId =
				plan === "monthly"
					? env.NEXT_PUBLIC_CREEM_PRO_MONTHLY_PRODUCT_ID
					: env.NEXT_PUBLIC_CREEM_PRO_YEARLY_PRODUCT_ID;
			if (!productId) {
				toast({
					message: "This plan is not available yet.",
					state: "error",
				});
				return;
			}

			const { data, error } = await authClient.creem.createCheckout({
				productId,
				successUrl: window.location.origin,
			});
			if (error) {
				toast({ message: getAuthErrorMessage(error), state: "error" });
				return;
			}
			if (data?.url) window.location.assign(data.url);
			else
				toast({
					message: "Could not start checkout. Please try again.",
					state: "error",
				});
		} catch {
			toast({
				message: "Could not start checkout. Please try again.",
				state: "error",
			});
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<PlanCard
			variant={variant}
			className={className}
			loading={isPending || isLoading}
			onChoose={(plan) => void choosePlan(plan)}
		/>
	);
}

export function PlanDialog({
	open,
	onOpenChange,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto p-2 sm:max-w-sm">
				<DialogHeader className="sr-only">
					<DialogTitle className="sr-only">Upgrade to Pro</DialogTitle>
					<DialogDescription className="sr-only">
						Compare Pro billing options and choose a plan.
					</DialogDescription>
				</DialogHeader>
				<PlanPicker variant="default" />
			</DialogContent>
		</Dialog>
	);
}

export function PlanDialogButton({
	children = "Get Pro",
	...buttonProps
}: React.ComponentProps<typeof Button>) {
	const [open, setOpen] = useState(false);
	return (
		<>
			<Button {...buttonProps} onClick={() => setOpen(true)}>
				{children}
			</Button>
			<PlanDialog open={open} onOpenChange={setOpen} />
		</>
	);
}
