"use client";

import { Badge } from "@grabbin/ui/components/badge";
import { Button } from "@grabbin/ui/components/button";
import Loading from "@grabbin/ui/components/loading";
import { Tabs, TabsList, TabsTrigger } from "@grabbin/ui/components/tabs";
import { cn } from "@grabbin/ui/lib/utils";
import { useState } from "react";
import { CheckCircle } from "reicon-react/icons/CheckCircle";
import { Diamonds } from "reicon-react/icons/Diamonds";
import { Globe } from "reicon-react/icons/Globe";
import { Tag5 } from "reicon-react/icons/Tag5";
import SpinningCounter from "@/components/page/shared/spinning-counter";

export type BillingPeriod = "monthly" | "yearly";
export type PlanCardVariant = "default" | "horizontal" | "landing";

type PlanFeature = {
	label: string;
	Icon?: typeof CheckCircle;
	color?: string;
};

export default function PlanCard({
	variant = "default",
	className,
	loading = false,
	onChoose,
}: {
	variant?: PlanCardVariant;
	className?: string;
	loading?: boolean;
	onChoose: (period: BillingPeriod) => void;
}) {
	const isHorizontal = variant === "horizontal";
	const isLanding = variant === "landing";
	const [period, setPeriod] = useState<BillingPeriod>("monthly");
	const isYearly = period === "yearly";
	const price = isYearly ? "$86" : "$9";
	const features: PlanFeature[] = isLanding
		? [
				{
					label: "Remove watermark",
					Icon: Tag5,
					color: "text-amber-400",
				},
				{
					label: "Connect your own domain",
					Icon: Globe,
					color: "text-brand-green",
				},
				{
					label: "Customize with Premium Widgets",
					Icon: Diamonds,
					color: "text-sky-400",
				},
			]
		: [
				{ label: "All Free plan features included" },
				{ label: "Remove watermark" },
				{ label: "Custom domain" },
				{ label: "Advanced Widgets" },
			];
	const Container = isLanding ? "div" : "section";

	return (
		<Container
			className={cn(
				"grid gap-4 rounded-2xl bg-card p-5",
				isHorizontal && "smooth-shadow-ring-sm",
				isLanding && "min-w-0 grid-cols-1 pb-0",
				className,
			)}
		>
			<div
				className={
					isHorizontal
						? "flex flex-row items-center justify-between gap-4"
						: "contents"
				}
			>
				{!isLanding && (
					<div
						className={
							isHorizontal ? "grid gap-1" : "order-1 grid gap-1 text-center"
						}
					>
						<h2 className="font-heading font-medium text-lg">Pro</h2>
						<p className="text-muted-foreground text-sm">
							Everything you need to grow your page.
						</p>
					</div>
				)}
				{isHorizontal && (
					<Tabs
						value={period}
						onValueChange={(value) => {
							if (value === "monthly" || value === "yearly") setPeriod(value);
						}}
						className="shrink-0"
					>
						<TabsList size="lg" className="grid grid-cols-2">
							<TabsTrigger value="monthly">Monthly</TabsTrigger>
							<TabsTrigger value="yearly">Yearly</TabsTrigger>
						</TabsList>
					</Tabs>
				)}
			</div>

			<div className={isHorizontal ? "flex flex-row gap-8" : "contents"}>
				<div
					className={
						isHorizontal ? "flex min-w-0 flex-1 flex-col gap-4" : "contents"
					}
				>
					<div
						className={cn(
							"order-3 grid gap-1",
							isLanding && "justify-items-center",
						)}
						aria-live="polite"
					>
						<div
							className={cn(
								"flex items-center justify-between gap-2",
								isLanding && "flex-col justify-center",
							)}
						>
							{isLanding && (
								<div className="flex h-5 items-center justify-center">
									{isYearly && (
										<Badge variant="secondary" className="shrink-0 rounded-sm">
											Save 20%
										</Badge>
									)}
								</div>
							)}
							<div className="flex items-baseline gap-2">
								<span className="font-heading font-semibold text-4xl tabular-nums tracking-tight">
									<span className="sr-only">{price}</span>
									<span
										aria-hidden="true"
										className="inline-flex items-baseline [--reel-cell:36px]"
									>
										$
										<SpinningCounter value={Number(price.slice(1))} />
									</span>
								</span>
								{isYearly && (
									<span className="font-heading font-semibold text-4xl text-muted-foreground tabular-nums tracking-tight line-through">
										$108
									</span>
								)}
							</div>
							{isYearly && !isLanding && (
								<Badge variant="secondary" className="shrink-0 rounded-sm">
									Save 20%
								</Badge>
							)}
						</div>
					</div>

					<Button
						type="button"
						size="xl"
						variant="brandBlack"
						className={cn(
							"order-5 h-12 w-full rounded-lg text-lg",
							isLanding && "mx-auto max-w-sm rounded-full",
						)}
						disabled={loading}
						onClick={() => onChoose(period)}
					>
						{loading ? (
							<Loading />
						) : isLanding ? (
							`Start at ${price}/${isYearly ? "year" : "month"}`
						) : (
							"Get Pro"
						)}
					</Button>
				</div>

				<div className={isHorizontal ? "min-w-0 flex-1" : "contents"}>
					{!isHorizontal && (
						<Tabs
							value={period}
							onValueChange={(value) => {
								if (value === "monthly" || value === "yearly") setPeriod(value);
							}}
							className={cn(
								"order-2",
								isLanding && "mx-auto mb-4 w-full max-w-72",
							)}
						>
							<TabsList
								size={isLanding ? "xl" : "lg"}
								className={cn(
									"grid w-full grid-cols-2",
									isLanding &&
										"rounded-full [&_[data-slot=tabs-indicator]]:rounded-full",
								)}
							>
								<TabsTrigger
									value="monthly"
									className={isLanding ? "rounded-full" : undefined}
								>
									Monthly
								</TabsTrigger>
								<TabsTrigger
									value="yearly"
									className={isLanding ? "rounded-full" : undefined}
								>
									Yearly
								</TabsTrigger>
							</TabsList>
						</Tabs>
					)}

					<ul
						className={cn(
							"order-4 grid gap-2",
							isHorizontal ? "xl:grid-cols-2" : !isLanding && "pt-4",
							isLanding && "justify-items-center text-center",
						)}
					>
						{features.map(({ label, Icon = CheckCircle, color }) => (
							<li
								key={label}
								className={cn(
									"flex items-start gap-2.5 text-base",
									isLanding &&
										"whitespace-nowrap text-lg leading-snug sm:text-xl",
									isLanding && "justify-center",
								)}
							>
								{!isLanding && (
									<Icon
										aria-hidden="true"
										weight="Filled"
										className={cn(
											"mt-0.5 size-5 shrink-0",
											color ?? "text-brand-green",
										)}
									/>
								)}
								<span>
									{label}
									{isLanding && (
										<Icon
											aria-hidden="true"
											weight="Filled"
											className={cn(
												"ml-1.5 inline-block size-[1.2em] overflow-visible align-[-0.2em] drop-shadow-[0_2px_2px_rgba(0,0,0,0.15)]",
												color,
											)}
											stroke="white"
											style={{ strokeWidth: 3.5, paintOrder: "stroke" }}
										/>
									)}
								</span>
							</li>
						))}
					</ul>
				</div>
			</div>
		</Container>
	);
}

export { PlanCard };
