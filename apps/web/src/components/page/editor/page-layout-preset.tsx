"use client";

import type { BentoBreakpoint } from "@grabbin/bento-layout";
import { Button } from "@grabbin/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogTitle,
} from "@grabbin/ui/components/dialog";
import Loading from "@grabbin/ui/components/loading";
import { Separator } from "@grabbin/ui/components/separator";
import { Tabs, TabsList, TabsTrigger } from "@grabbin/ui/components/tabs";
import { Laptop, Smartphone } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { startTransition, useEffect, useState } from "react";
import ShareLinkContent from "../sharing/share-link-content";
import AddWidgetButton, {
	type AddWidgetButtonProps,
} from "./add-widget-button";

type PageLayoutPresetProps = {
	value: BentoBreakpoint;
	onChange: (breakpoint: BentoBreakpoint) => void;
	isAutoSaving: boolean;
	profileImageUrl: string | null;
	demoPreview?: boolean;
	widgetActions: AddWidgetButtonProps | null;
};

export default function PageLayoutPreset({
	value,
	onChange,
	isAutoSaving,
	profileImageUrl,
	demoPreview = false,
	widgetActions,
}: PageLayoutPresetProps) {
	const reduceMotion = useReducedMotion();
	const [activeBreakpoint, setActiveBreakpoint] = useState(value);
	const [shareDialogOpen, setShareDialogOpen] = useState(false);
	const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(
		null,
	);
	useEffect(() => setActiveBreakpoint(value), [value]);

	const selectBreakpoint = (breakpoint: BentoBreakpoint) => {
		if (breakpoint === activeBreakpoint) return;
		setActiveBreakpoint(breakpoint);
		startTransition(() => onChange(breakpoint));
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
					}}
				>
					<Button
						type="button"
						size="default"
						variant="outline"
						disabled={isAutoSaving}
						onClick={() => {
							if (demoPreview) {
								setPortalContainer(
									document.querySelector<HTMLElement>(
										"[data-demo-preview-root]",
									),
								);
							}
							setShareDialogOpen(true);
						}}
						className="relative z-10 h-9 w-28 px-3 font-semibold"
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
						portalContainer={demoPreview ? portalContainer : undefined}
						className="aspect-square gap-5 p-5"
						aria-describedby="share-qr-description"
					>
						<DialogTitle className="sr-only">Share your page</DialogTitle>
						<DialogDescription id="share-qr-description" className="sr-only">
							Scan this QR code to open your page.
						</DialogDescription>
						<ShareLinkContent profileImageUrl={profileImageUrl} />
					</DialogContent>
				</Dialog>
				<Separator
					orientation="vertical"
					className="mx-2 rounded-lg bg-border/80 data-vertical:my-2.5 data-vertical:w-[2.5px]"
				/>
				{widgetActions ? <AddWidgetButton {...widgetActions} /> : null}
				<Separator
					orientation="vertical"
					className="mx-2 rounded-lg bg-border/80 data-vertical:my-2.5 data-vertical:w-[2.5px]"
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
