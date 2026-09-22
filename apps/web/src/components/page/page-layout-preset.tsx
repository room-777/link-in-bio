"use client";

import type { BentoBreakpoint } from "@grabbin/bento-layout";
import { Button } from "@grabbin/ui/components/button";
import Loading from "@grabbin/ui/components/loading";
import { Laptop, Smartphone } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";

type PageLayoutPresetProps = {
	value: BentoBreakpoint;
	onChange: (breakpoint: BentoBreakpoint) => void;
	isAutoSaving: boolean;
};

export default function PageLayoutPreset({
	value,
	onChange,
	isAutoSaving,
}: PageLayoutPresetProps) {
	const reduceMotion = useReducedMotion();
	const layoutTransition = reduceMotion
		? { duration: 0 }
		: { type: "spring" as const, stiffness: 560, damping: 32, mass: 0.8 };

	const handleShareLink = async () => {
		try {
			await navigator.clipboard.writeText(window.location.href);
		} catch {
			// Clipboard access can be unavailable without browser permission.
		}
	};

	return (
		<div className="smooth-shadow-ring-lg smooth-ring-neutral-200/40 pointer-events-none fixed bottom-10 left-1/2 z-100003 flex -translate-x-1/2 items-center gap-3 rounded-xl bg-background p-1 shadow-neutral-900">
			<fieldset className="pointer-events-auto relative flex items-center gap-1 p-1">
				<legend className="sr-only">Editing layout breakpoint</legend>
				<Button
					type="button"
					size="default"
					variant="ghost"
					disabled={isAutoSaving}
					onClick={handleShareLink}
					className="smooth-shadow-md relative z-10 h-9 w-28 border-brand-green bg-brand-green! px-3 text-white! outline-depth hover:bg-brand-green/80! hover:text-white!"
				>
					{isAutoSaving ? (
						<>
							<Loading aria-hidden="true" className="size-4" />
							Saving...
						</>
					) : (
						"Share Link"
					)}
				</Button>
				<Button
					type="button"
					size="default"
					variant="ghost"
					aria-pressed={value === "compact"}
					aria-label="Edit compact layout"
					onClick={() => onChange("compact")}
					className="relative z-10 px-5 text-foreground hover:bg-transparent aria-pressed:text-primary-foreground aria-pressed:hover:text-primary-foreground"
				>
					{value === "compact" ? (
						<motion.span
							layoutId="owner-page-layout-breakpoint-selection"
							initial={false}
							transition={layoutTransition}
							aria-hidden="true"
							className="smooth-shadow-xs pointer-events-none absolute inset-0 rounded-lg bg-primary drop-shadow-lg!"
						/>
					) : null}
					<Smartphone className="relative z-10 size-5" aria-hidden="true" />
					<span className="sr-only">Compact</span>
				</Button>
				<Button
					type="button"
					size="default"
					variant="ghost"
					aria-pressed={value === "wide"}
					aria-label="Edit wide layout"
					onClick={() => onChange("wide")}
					className="relative z-10 px-5 text-foreground hover:bg-transparent aria-pressed:text-primary-foreground aria-pressed:hover:text-primary-foreground"
				>
					{value === "wide" ? (
						<motion.span
							layoutId="owner-page-layout-breakpoint-selection"
							initial={false}
							transition={layoutTransition}
							aria-hidden="true"
							className="smooth-shadow-xs pointer-events-none absolute inset-0 rounded-lg bg-primary drop-shadow-lg!"
						/>
					) : null}
					<Laptop className="relative z-10 size-5" aria-hidden="true" />
					<span className="sr-only">Wide</span>
				</Button>
			</fieldset>
		</div>
	);
}
