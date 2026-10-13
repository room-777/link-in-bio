"use client";

import { Button } from "@grabbin/ui/components/button";
import Loading from "@grabbin/ui/components/loading";
import { QrCode } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { openShareLinkDialog } from "../sharing/share-link-dialog";

export default function MobileShareLinkButton({
	isAutoSaving,
	profileImageUrl,
}: {
	isAutoSaving: boolean;
	profileImageUrl: string | null;
}) {
	const reduceMotion = useReducedMotion();

	return (
		<>
			<Button
				type="button"
				variant="default"
				size="icon-lg"
				className="fixed right-6 bottom-9 z-50 page-wide:hidden size-15 rounded-full"
				aria-label={isAutoSaving ? "Saving..." : "Share link"}
				disabled={isAutoSaving}
				onClick={() => openShareLinkDialog(profileImageUrl, true)}
			>
				<span className="relative inline-grid size-6 place-items-center">
					<AnimatePresence initial={false} mode="popLayout">
						<motion.span
							key={isAutoSaving ? "loading" : "qr-code"}
							initial={
								reduceMotion
									? false
									: { opacity: 0, scale: 0.25, filter: "blur(4px)" }
							}
							animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
							exit={{ opacity: 0, scale: 0.25, filter: "blur(4px)" }}
							transition={{ type: "spring", duration: 0.3, bounce: 0 }}
							className="col-start-1 row-start-1 inline-flex items-center justify-center"
							aria-hidden="true"
						>
							{isAutoSaving ? (
								<Loading className="size-5" />
							) : (
								<QrCode className="size-6" />
							)}
						</motion.span>
					</AnimatePresence>
				</span>
			</Button>
		</>
	);
}
