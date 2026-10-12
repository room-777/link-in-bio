"use client";

import { Button } from "@grabbin/ui/components/button";

export function BillingTabContent({
	isPro,
	disabled,
	isOpeningPortal,
	onPlanAction,
}: {
	isPro: boolean;
	disabled: boolean;
	isOpeningPortal: boolean;
	onPlanAction: () => void;
}) {
	return (
		<section className="flex items-center justify-between gap-4">
			<div>
				<h2 className="font-medium text-base">Plan</h2>
				<p className="text-muted-foreground text-sm">
					{isPro ? "Pro" : "Free"}
				</p>
			</div>
			<Button
				variant="outline"
				disabled={disabled || isOpeningPortal}
				onClick={onPlanAction}
				className="rounded-md"
			>
				{isOpeningPortal ? "Opening…" : isPro ? "Manage plan" : "Upgrade"}
			</Button>
		</section>
	);
}
