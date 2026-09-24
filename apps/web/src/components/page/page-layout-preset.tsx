"use client";

import type { BentoBreakpoint } from "@grabbin/bento-layout";
import { Button } from "@grabbin/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogTitle,
} from "@grabbin/ui/components/dialog";
import Loading from "@grabbin/ui/components/loading";
import { Separator } from "@grabbin/ui/components/separator";
import { Tabs, TabsList, TabsTrigger } from "@grabbin/ui/components/tabs";
// ponytail: Keep qr at 0.5.5 until Cuer stops passing border=0 to newer encoders.
import { Cuer } from "cuer";
import { Laptop, Smartphone } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { startTransition, useEffect, useRef, useState } from "react";

type PageLayoutPresetProps = {
	value: BentoBreakpoint;
	onChange: (breakpoint: BentoBreakpoint) => void;
	isAutoSaving: boolean;
	profileImageUrl: string | null;
};

export default function PageLayoutPreset({
	value,
	onChange,
	isAutoSaving,
	profileImageUrl,
}: PageLayoutPresetProps) {
	const reduceMotion = useReducedMotion();
	const [activeBreakpoint, setActiveBreakpoint] = useState(value);
	const [shareDialogOpen, setShareDialogOpen] = useState(false);
	const [copyState, setCopyState] = useState<"idle" | "copied" | "error">(
		"idle",
	);
	const [isLabelExiting, setIsLabelExiting] = useState(false);
	const [isLabelEntering, setIsLabelEntering] = useState(false);
	const labelRef = useRef<HTMLSpanElement>(null);
	const swapTimerRef = useRef<number | null>(null);
	const resetTimerRef = useRef<number | null>(null);
	useEffect(() => setActiveBreakpoint(value), [value]);
	useEffect(
		() => () => {
			if (swapTimerRef.current !== null)
				window.clearTimeout(swapTimerRef.current);
			if (resetTimerRef.current !== null)
				window.clearTimeout(resetTimerRef.current);
		},
		[],
	);

	const selectBreakpoint = (breakpoint: BentoBreakpoint) => {
		if (breakpoint === activeBreakpoint) return;
		setActiveBreakpoint(breakpoint);
		startTransition(() => onChange(breakpoint));
	};
	const swapCopyState = (nextState: "idle" | "copied" | "error") => {
		if (swapTimerRef.current !== null)
			window.clearTimeout(swapTimerRef.current);
		setIsLabelExiting(true);
		const duration =
			Number.parseFloat(
				getComputedStyle(document.documentElement).getPropertyValue(
					"--text-swap-dur",
				),
			) || 150;
		swapTimerRef.current = window.setTimeout(() => {
			setCopyState(nextState);
			setIsLabelExiting(false);
			setIsLabelEntering(true);
			requestAnimationFrame(() => {
				if (labelRef.current) void labelRef.current.offsetHeight;
				setIsLabelEntering(false);
			});
			swapTimerRef.current = null;
		}, duration);
	};

	const handleCopyLink = async () => {
		try {
			await navigator.clipboard.writeText(window.location.href);
			if (resetTimerRef.current !== null)
				window.clearTimeout(resetTimerRef.current);
			swapCopyState("copied");
			resetTimerRef.current = window.setTimeout(() => {
				swapCopyState("idle");
				resetTimerRef.current = null;
			}, 1800);
		} catch {
			swapCopyState("error");
		}
	};

	return (
		<motion.div
			initial={reduceMotion ? false : { opacity: 0.2, y: 12, x: "-50%" }}
			animate={{ opacity: 1, y: 0, x: "-50%" }}
			transition={
				reduceMotion
					? { duration: 0 }
					: { duration: 0.45, ease: [0.22, 0.61, 0.36, 1] }
			}
			className="smooth-shadow-ring-lg smooth-ring-neutral-200/40 pointer-events-none fixed bottom-10 left-1/2 z-[100003] flex items-center gap-3 rounded-xl bg-background p-1 shadow-neutral-900"
		>
			<fieldset className="pointer-events-auto flex items-center gap-1 p-1">
				<legend className="sr-only">Editing layout breakpoint</legend>
				<Dialog
					open={shareDialogOpen}
					onOpenChange={(open) => {
						setShareDialogOpen(open);
						setCopyState("idle");
						setIsLabelExiting(false);
						setIsLabelEntering(false);
						if (!open) {
							if (swapTimerRef.current !== null)
								window.clearTimeout(swapTimerRef.current);
							if (resetTimerRef.current !== null)
								window.clearTimeout(resetTimerRef.current);
						}
					}}
				>
					<Button
						type="button"
						size="default"
						variant="ghost"
						disabled={isAutoSaving}
						onClick={() => setShareDialogOpen(true)}
						className="relative z-10 h-9 w-28 border-brand-green bg-brand-green! px-3 text-white! hover:bg-brand-green/80! hover:text-white!"
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
					<DialogContent
						className="aspect-square gap-5 p-5"
						aria-describedby="share-qr-description"
					>
						<DialogTitle className="sr-only">Share your page</DialogTitle>
						<DialogDescription id="share-qr-description" className="sr-only">
							Scan this QR code to open your page.
						</DialogDescription>
						<div className="mt-9 flex items-center justify-center py-3">
							<Cuer
								value={window.location.href}
								color="#171717"
								className="size-48"
								arena={profileImageUrl ?? "/favicon.svg"}
								aria-label="QR code for your page"
							/>
						</div>
						<DialogFooter className="flex-row border-t-0 bg-background sm:justify-center">
							<Button
								type="button"
								variant="outline"
								className="w-28"
								onClick={() => void handleCopyLink()}
							>
								<span
									ref={labelRef}
									className={[
										"t-text-swap",
										isLabelExiting && "is-exit",
										isLabelEntering && "is-enter-start",
									]
										.filter(Boolean)
										.join(" ")}
									aria-live="polite"
								>
									{copyState === "copied"
										? "Copied Link"
										: copyState === "error"
											? "Copy Failed"
											: "Copy Link"}
								</span>
							</Button>
						</DialogFooter>
					</DialogContent>
				</Dialog>
				<Separator
					orientation="vertical"
					className="mx-2 rounded-lg data-vertical:my-2 data-vertical:w-[2.5px]"
				/>
				<Tabs
					value={activeBreakpoint}
					onValueChange={(breakpoint) => {
						if (breakpoint === "compact" || breakpoint === "wide")
							selectBreakpoint(breakpoint);
					}}
					className="shrink-0"
				>
					<TabsList size="default" className="grid grid-cols-2 gap-1 p-0.5">
						<TabsTrigger
							value="compact"
							aria-label="Edit compact layout"
							className="h-full w-12 px-0"
						>
							<Smartphone className="size-5" aria-hidden="true" />
							<span className="sr-only">Compact</span>
						</TabsTrigger>
						<TabsTrigger
							value="wide"
							aria-label="Edit wide layout"
							className="h-full w-12 px-0"
						>
							<Laptop className="size-5" aria-hidden="true" />
							<span className="sr-only">Wide</span>
						</TabsTrigger>
					</TabsList>
				</Tabs>
			</fieldset>
		</motion.div>
	);
}
