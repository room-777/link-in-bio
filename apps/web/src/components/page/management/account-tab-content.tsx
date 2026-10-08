"use client";

import { Button } from "@grabbin/ui/components/button";
import { CheckCircle } from "reicon-react/icons/CheckCircle";
import { Verified } from "reicon-react/icons/Verified";
import { CalendlyAccountTabContent } from "./calendly-account-tab-content";

export function AccountTabContent({
	email,
	isPro,
	onUpgrade,
}: {
	email?: string;
	isPro: boolean;
	onUpgrade: () => void;
}) {
	return (
		<>
			<section className="flex min-w-0 flex-col gap-3">
				<h2 className="font-medium text-base">Your email</h2>
				<div className="flex h-11 min-w-0 items-center justify-between gap-2 rounded-lg bg-secondary p-3 pl-3.5">
					<p className="truncate text-base text-primary">{email}</p>
					<CheckCircle
						aria-hidden="true"
						weight="Filled"
						className="size-6 shrink-0 text-brand-green"
					/>
				</div>
			</section>
			<section className="mt-5 flex min-w-0 flex-col gap-3">
				<div className="flex flex-col gap-1">
					<h2 className="flex items-center gap-1 font-medium text-base">
						Connected accounts
						<Verified
							aria-hidden="true"
							weight="Filled"
							className="size-5 text-brand-blue"
						/>
					</h2>
					{!isPro ? (
						<p className="text-muted-foreground text-sm">
							These features are available to Pro users only.{" "}
							<Button
								type="button"
								variant="link"
								size="sm"
								className="h-auto p-0 align-baseline"
								onClick={onUpgrade}
							>
								Upgrade to Pro
							</Button>{" "}
							to use them.
						</p>
					) : null}
				</div>
				<CalendlyAccountTabContent isPro={isPro} />
			</section>
		</>
	);
}
