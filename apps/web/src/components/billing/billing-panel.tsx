"use client";

import { Badge } from "@grabbin/ui/components/badge";
import { Button } from "@grabbin/ui/components/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@grabbin/ui/components/card";
import { toast } from "@grabbin/ui/components/toast";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { apiClient, getApiErrorMessage } from "@/lib/api-client";
import { authClient } from "@/lib/auth-client";
import { getSignInHref } from "@/lib/auth-redirect";
import { PlanDialogButton } from "./plan-dialog";

function statusLabel(status: string) {
	const normalizedStatus = status.toLowerCase();
	if (["active", "trialing", "paid"].includes(normalizedStatus))
		return "Active";
	if (normalizedStatus === "scheduled_cancel") return "Cancels at period end";
	if (normalizedStatus === "canceled") return "Canceled";
	if (["past_due", "unpaid"].includes(normalizedStatus))
		return "Payment pending";
	return "Inactive";
}

export default function BillingPanel() {
	const router = useRouter();
	const { data: session, isPending } = authClient.useSession();

	useEffect(() => {
		if (!isPending && !session) router.replace(getSignInHref("/billing"));
	}, [isPending, router, session]);

	if (isPending) return <p>Checking your account...</p>;
	if (!session) return null;

	const plan = (
		session as typeof session & {
			plan: {
				hasAccess: boolean;
				status: string | null;
				periodEnd: string | null;
				subscriptionId: string | null;
			};
		}
	).plan;
	const hasAccess = plan.hasAccess;
	const canCancel =
		hasAccess &&
		["active", "trialing", "paid"].includes(plan.status?.toLowerCase() ?? "");

	const openPortal = async () => {
		const { data, error } = await authClient.creem.createPortal();
		if (error || !data?.url) {
			toast({
				message: "Could not open billing management. Please try again.",
				state: "error",
			});
			return;
		}
		window.location.assign(data.url);
	};

	const cancelSubscription = async () => {
		const response = await apiClient.billing["cancel-subscription"].$post();
		if (!response.ok) {
			toast({
				message: await getApiErrorMessage(response),
				state: "error",
			});
			return;
		}
		window.location.reload();
	};

	return (
		<div className="grid gap-4">
			<Card>
				<CardHeader>
					<CardTitle>Subscription</CardTitle>
					<CardDescription>
						Your plan and renewal status are synced from Creem.
					</CardDescription>
				</CardHeader>
				<CardContent className="grid gap-4">
					<div className="flex items-center gap-2">
						<Badge variant={hasAccess ? "default" : "secondary"}>
							{plan.status ? statusLabel(plan.status) : "No subscription"}
						</Badge>
						{plan.periodEnd && (
							<span className="text-muted-foreground text-sm">
								Period end:{" "}
								{new Date(plan.periodEnd).toLocaleDateString("en-US")}
							</span>
						)}
					</div>
					<div className="flex flex-wrap gap-2">
						{!hasAccess && <PlanDialogButton>View Pro plans</PlanDialogButton>}
						{canCancel && (
							<Button variant="outline" onClick={cancelSubscription}>
								Cancel subscription
							</Button>
						)}
						<Button variant="outline" onClick={openPortal}>
							Billing portal
						</Button>
					</div>
				</CardContent>
			</Card>
			<Card>
				<CardHeader>
					<CardTitle>Pro access</CardTitle>
					<CardDescription>
						Pro includes up to three pages per account.
					</CardDescription>
				</CardHeader>
				<CardContent>
					{hasAccess
						? "Pro features are available."
						: "Choose a Pro plan to unlock more pages."}
				</CardContent>
			</Card>
		</div>
	);
}
