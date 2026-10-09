"use client";

import type { BentoBreakpoint } from "@grabbin/bento-layout";
import { Separator } from "@grabbin/ui/components/separator";
import { Tabs, TabsList, TabsTrigger } from "@grabbin/ui/components/tabs";
import { Laptop, Smartphone } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { startTransition, useEffect, useState } from "react";
import AddWidgetButton, {
	type AddWidgetButtonProps,
} from "./add-widget-button";

type PageEditorToolbarProps = {
	value: BentoBreakpoint;
	onChange: (breakpoint: BentoBreakpoint) => void;
	widgetActions: AddWidgetButtonProps;
};

export default function PageEditorToolbar({
	value,
	onChange,
	widgetActions,
}: PageEditorToolbarProps) {
	const reduceMotion = useReducedMotion();
	const [activeBreakpoint, setActiveBreakpoint] = useState(value);
	useEffect(() => setActiveBreakpoint(value), [value]);

	const selectBreakpoint = (breakpoint: BentoBreakpoint) => {
		if (breakpoint === activeBreakpoint) return;
		setActiveBreakpoint(breakpoint);
		startTransition(() => onChange(breakpoint));
	};
	return (
		<motion.div
			initial={reduceMotion ? false : { opacity: 0, y: 12, x: "-50%" }}
			animate={{ opacity: 1, y: 0, x: "-50%" }}
			transition={
				reduceMotion
					? { duration: 0 }
					: { duration: 0.45, ease: [0.22, 0.61, 0.36, 1] }
			}
			className="smooth-shadow-ring-2xl smooth-ring-neutral-200/30 pointer-events-none fixed bottom-10 left-1/2 z-[100003] flex items-center gap-3 rounded-xl bg-background p-1 shadow-neutral-400"
		>
			<fieldset className="pointer-events-auto flex items-center gap-1 p-1">
				<legend className="sr-only">Page editor toolbar</legend>
				<AddWidgetButton {...widgetActions} />
				<Separator
					orientation="vertical"
					className="mx-2 page-wide:block hidden rounded-lg bg-border/80 data-vertical:my-2.5 data-vertical:w-[2.5px]"
				/>
				<Tabs
					value={activeBreakpoint}
					onValueChange={(breakpoint) => {
						if (breakpoint === "compact" || breakpoint === "wide")
							selectBreakpoint(breakpoint);
					}}
					className="page-wide:block hidden shrink-0"
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
