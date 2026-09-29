"use client";

import { Badge } from "@grabbin/ui/components/badge";
import { Button } from "@grabbin/ui/components/button";
import Loading from "@grabbin/ui/components/loading";
import { Tabs, TabsList, TabsTrigger } from "@grabbin/ui/components/tabs";
import { cn } from "@grabbin/ui/lib/utils";
import { BarChart3, Globe2, Sparkles } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useState } from "react";
import { CheckCircle } from "reicon-react/icons/CheckCircle";

const upcomingFeatures = [
	{ label: "Advanced Widgets", Icon: Sparkles },
	{ label: "Custom domain", Icon: Globe2 },
	{ label: "Advanced analytics", Icon: BarChart3 },
];

function SlidingNumber({
	value,
	reduceMotion,
}: {
	value: string;
	reduceMotion: boolean;
}) {
	const [whole, fraction] = value.replace("$", "").split(".");

	return (
		<span className="inline-flex items-baseline">
			<span className="sr-only">{value}</span>
			<span className="inline-flex items-baseline" aria-hidden="true">
				<span>$</span>
				{whole.split("").map((digit, index) => (
					<SlidingDigit
						key={`whole-${index}`}
						digit={digit}
						reduceMotion={reduceMotion}
					/>
				))}
				{fraction !== undefined && (
					<>
						<span>.</span>
						{fraction.split("").map((digit, index) => (
							<SlidingDigit
								key={`fraction-${index}`}
								digit={digit}
								reduceMotion={reduceMotion}
							/>
						))}
					</>
				)}
			</span>
		</span>
	);
}

function SlidingDigit({
	digit,
	reduceMotion,
}: {
	digit: string;
	reduceMotion: boolean;
}) {
	return (
		<span className="relative inline-block h-[1em] overflow-hidden align-bottom">
			<motion.span
				className="flex flex-col leading-none"
				initial={false}
				animate={{ y: `-${digit}em` }}
				transition={
					reduceMotion
						? { duration: 0 }
						: { type: "spring", duration: 0.45, bounce: 0 }
				}
			>
				{Array.from({ length: 10 }, (_, number) => (
					<span key={number} className="h-[1em]">
						{number}
					</span>
				))}
			</motion.span>
		</span>
	);
}

function SlidingText({
	value,
	reduceMotion,
}: {
	value: string;
	reduceMotion: boolean;
}) {
	return (
		<span className="inline-grid h-[1.5em] overflow-hidden align-bottom">
			<AnimatePresence initial={false} mode="wait">
				<motion.span
					key={value}
					initial={reduceMotion ? false : { y: "100%" }}
					animate={{ y: "0%" }}
					exit={{ y: "-100%" }}
					transition={{
						duration: reduceMotion ? 0 : 0.22,
						ease: [0.23, 1, 0.32, 1],
					}}
					className="col-start-1 row-start-1 inline-block"
				>
					{value}
				</motion.span>
			</AnimatePresence>
		</span>
	);
}

export type BillingPeriod = "monthly" | "yearly";
export type PlanCardVariant = "default" | "horizontal";

export function PlanCard({
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
	const reduceMotion = useReducedMotion() ?? false;
	const isHorizontal = variant === "horizontal";
	const [period, setPeriod] = useState<BillingPeriod>("monthly");
	const isYearly = period === "yearly";
	const price = isYearly ? "$86" : "$9";

	return (
		<section
			className={cn(
				isHorizontal && "smooth-shadow-ring-sm",
				"grid gap-4 rounded-2xl bg-card p-5",
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
					<div className="order-3 grid gap-1" aria-live="polite">
						<div className="flex items-center justify-between gap-2">
							<div className="flex items-baseline gap-2">
								<span className="font-heading font-semibold text-4xl tabular-nums tracking-tight">
									<SlidingNumber value={price} reduceMotion={reduceMotion} />
								</span>
								<span className="text-muted-foreground text-sm">
									<SlidingText
										value={isYearly ? "/ year" : "/ month"}
										reduceMotion={reduceMotion}
									/>
								</span>
							</div>
							{isYearly && (
								<Badge variant="secondary" className="shrink-0 rounded-sm">
									Save 20%
								</Badge>
							)}
						</div>
						<div className="min-h-5 text-muted-foreground text-sm">
							{isYearly && <span className="line-through">$108</span>}
						</div>
					</div>

					<Button
						type="button"
						size="xl"
						variant="brandBlack"
						className="order-5 h-12 w-full rounded-lg text-lg"
						disabled={loading}
						onClick={() => onChoose(period)}
					>
						{loading ? <Loading /> : "Get Pro"}
					</Button>
				</div>

				<div className={isHorizontal ? "min-w-0 flex-1" : "contents"}>
					{!isHorizontal && (
						<Tabs
							value={period}
							onValueChange={(value) => {
								if (value === "monthly" || value === "yearly") setPeriod(value);
							}}
							className="order-2"
						>
							<TabsList size="lg" className="grid w-full grid-cols-2">
								<TabsTrigger value="monthly">Monthly</TabsTrigger>
								<TabsTrigger value="yearly">Yearly</TabsTrigger>
							</TabsList>
						</Tabs>
					)}

					<ul
						className={`order-4 grid gap-2 font-medium ${isHorizontal ? "xl:grid-cols-2" : "pt-4"}`}
					>
						<li className="flex items-center gap-2.5 text-base">
							<CheckCircle
								aria-hidden="true"
								weight="Filled"
								className="size-5 shrink-0 text-brand-green"
							/>
							<span>All Free plan features included</span>
						</li>
						<li className="flex items-center gap-2.5 text-base">
							<CheckCircle
								aria-hidden="true"
								weight="Filled"
								className="size-5 shrink-0 text-brand-green"
							/>
							<span>Up to 3 pages per account</span>
						</li>
						<li className="flex items-center gap-2.5 text-base">
							<CheckCircle
								aria-hidden="true"
								weight="Filled"
								className="size-5 shrink-0 text-brand-green"
							/>
							<span>Remove watermark</span>
						</li>
						{!isHorizontal && (
							<li className="flex items-center gap-3 pt-2 text-muted-foreground text-xs uppercase">
								<span>Coming soon</span>
								<span aria-hidden="true" className="h-px flex-1 bg-border" />
							</li>
						)}
						{upcomingFeatures.map(({ label, Icon }) => (
							<li
								key={label}
								className="flex items-center gap-2.5 text-base text-muted-foreground"
							>
								<Icon aria-hidden="true" className="size-4 shrink-0" />
								<span>{label}</span>
								{isHorizontal && (
									<Badge
										variant="outline"
										className="ml-auto rounded-sm text-xs"
									>
										Coming soon
									</Badge>
								)}
							</li>
						))}
					</ul>
				</div>
			</div>
		</section>
	);
}
