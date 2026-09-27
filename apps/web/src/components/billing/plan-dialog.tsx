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
import { type BillingPeriod, PlanCard } from "./plan-card";
import { ShaderBadge } from "./shader-badge/badge";

export function PlanPicker() {
	const router = useRouter();
	const { data: session } = authClient.useSession();
	const [loadingPlan, setLoadingPlan] = useState<"monthly" | "yearly" | null>(
		null,
	);

	const startCheckout = async (plan: BillingPeriod) => {
		if (!session) {
			router.push(getSignInHref(window.location.pathname));
			return;
		}
		const productId =
			plan === "monthly"
				? env.NEXT_PUBLIC_CREEM_PRO_MONTHLY_PRODUCT_ID
				: env.NEXT_PUBLIC_CREEM_PRO_YEARLY_PRODUCT_ID;
		if (!productId) {
			toast({ message: "This plan is not available yet.", state: "error" });
			return;
		}

		setLoadingPlan(plan);
		try {
			const { data, error } = await authClient.creem.createCheckout({
				productId,
				successUrl: `${window.location.origin}/billing?checkout=success`,
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
			setLoadingPlan(null);
		}
	};

	return (
		<PlanCard
			loading={loadingPlan !== null}
			loadingPeriod={loadingPlan}
			onChoose={(plan) => void startCheckout(plan)}
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
			<DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto p-5 sm:max-w-md">
				<DialogHeader>
					<DialogTitle>
						<ShaderBadge preset="blur" tag="$8.99">
							Unlock more features with Pro
						</ShaderBadge>
					</DialogTitle>
					<DialogDescription className="sr-only">
						Compare Pro billing options and choose a plan.
					</DialogDescription>
				</DialogHeader>
				<PlanPicker />
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
