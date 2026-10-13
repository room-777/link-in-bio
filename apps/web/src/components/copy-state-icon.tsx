"use client";

import { Check, Copy } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

export default function CopyStateIcon({
	copied,
	reduceMotion,
}: {
	copied: boolean;
	reduceMotion: boolean;
}) {
	const iconKey = copied ? "copied" : "copy";

	return (
		<span className="relative inline-grid place-items-center">
			<AnimatePresence initial={false} mode="popLayout">
				<motion.span
					key={iconKey}
					initial={
						reduceMotion
							? false
							: { opacity: 0, scale: 0.25, filter: "blur(4px)" }
					}
					animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
					exit={{ opacity: 0, scale: 0.25, filter: "blur(4px)" }}
					transition={{ type: "spring", duration: 0.3, bounce: 0 }}
					className="col-start-1 row-start-1 inline-flex items-center gap-1.5"
				>
					{copied && <Check className="size-4" aria-hidden="true" />}
					{!copied && <Copy className="size-4" aria-hidden="true" />}
				</motion.span>
			</AnimatePresence>
		</span>
	);
}

export { CopyStateIcon };
