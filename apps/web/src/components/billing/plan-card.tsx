"use client";

import { Badge } from "@grabbin/ui/components/badge";
import { Button } from "@grabbin/ui/components/button";
import { Tabs, TabsList, TabsTrigger } from "@grabbin/ui/components/tabs";
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
				<span>.</span>
				{fraction.split("").map((digit, index) => (
					<SlidingDigit
						key={`fraction-${index}`}
						digit={digit}
						reduceMotion={reduceMotion}
					/>
				))}
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
		<span className="inline-grid h-[1.2em] overflow-hidden align-bottom">
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

export function PlanCard({
	loading = false,
	loadingPeriod,
	onChoose,
}: {
	loading?: boolean;
	loadingPeriod?: BillingPeriod | null;
	onChoose: (period: BillingPeriod) => void;
}) {
	const reduceMotion = useReducedMotion() ?? false;
	const [period, setPeriod] = useState<BillingPeriod>("monthly");
	const isYearly = period === "yearly";
	const price = isYearly ? "$76.80" : "$8.99";

	return (
		<section className="smooth-shadow-ring-xs grid gap-4 rounded-2xl bg-card p-5">
			<div className="flex items-start justify-between gap-3">
				<div className="grid gap-1">
					<h2 className="font-heading font-medium text-lg">Pro</h2>
					<p className="text-muted-foreground text-sm">
						Everything you need to grow your page.
					</p>
				</div>
				<Badge variant="secondary">{isYearly ? "Save 20%" : "Pro plan"}</Badge>
			</div>

			<Tabs
				value={period}
				onValueChange={(value) => {
					if (value === "monthly" || value === "yearly") setPeriod(value);
				}}
			>
				<TabsList size="lg" className="grid w-full grid-cols-2">
					<TabsTrigger value="monthly">Monthly</TabsTrigger>
					<TabsTrigger value="yearly">Yearly</TabsTrigger>
				</TabsList>
			</Tabs>

			<div className="grid gap-1" aria-live="polite">
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
				<div className="flex min-h-5 items-center gap-2 text-muted-foreground text-sm">
					{isYearly && <span className="line-through">$96.00</span>}
					<SlidingText
						value={isYearly ? "Billed yearly" : "Billed monthly"}
						reduceMotion={reduceMotion}
					/>
				</div>
			</div>

			<ul className="grid gap-2 pt-4">
				<li className="flex items-center gap-2.5 text-sm">
					<CheckCircle
						aria-hidden="true"
						weight="Filled"
						className="size-5 shrink-0 text-brand-green"
					/>
					<span>All Free plan features included</span>
				</li>
				<li className="flex items-center gap-2.5 text-sm">
					<CheckCircle
						aria-hidden="true"
						weight="Filled"
						className="size-5 shrink-0 text-brand-green"
					/>
					<span>Up to 3 pages per account</span>
				</li>
				<li className="flex items-center gap-2.5 text-sm">
					<CheckCircle
						aria-hidden="true"
						weight="Filled"
						className="size-5 shrink-0 text-brand-green"
					/>
					<span>Remove watermark</span>
				</li>
				{upcomingFeatures.map(({ label, Icon }) => (
					<li
						key={label}
						className="flex items-center gap-2.5 text-muted-foreground text-sm"
					>
						<Icon aria-hidden="true" className="size-4 shrink-0" />
						<span>{label}</span>
						<Badge variant="outline" className="ml-auto rounded-sm text-xs">
							Coming soon
						</Badge>
					</li>
				))}
			</ul>

			<Button
				type="button"
				className="w-full"
				disabled={loading}
				onClick={() => onChoose(period)}
			>
				{loadingPeriod === period ? "Loading..." : "Get Pro"}
			</Button>
		</section>
	);
}
