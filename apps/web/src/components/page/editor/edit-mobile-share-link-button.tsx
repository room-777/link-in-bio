"use client";

import { Button } from "@grabbin/ui/components/button";
import {
	Drawer,
	DrawerContent,
	DrawerDescription,
	DrawerHeader,
	DrawerTitle,
} from "@grabbin/ui/components/drawer";
import Loading from "@grabbin/ui/components/loading";
import { useIsMobile } from "@grabbin/ui/components/use-mobile";
import { QrCode } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useState } from "react";
import ShareLinkContent from "../sharing/share-link-content";

export default function MobileShareLinkButton({
	isAutoSaving,
	profileImageUrl,
}: {
	isAutoSaving: boolean;
	profileImageUrl: string | null;
}) {
	const isMobile = useIsMobile();
	const reduceMotion = useReducedMotion();
	const [open, setOpen] = useState(false);

	if (!isMobile) return null;

	return (
		<>
			<Button
				type="button"
				variant="default"
				size="icon-lg"
				className="fixed right-6 bottom-[6.5rem] z-50 size-13 rounded-full"
				aria-label={isAutoSaving ? "Saving..." : "Share link"}
				disabled={isAutoSaving}
				onClick={() => setOpen(true)}
			>
				<span className="relative inline-grid size-5 place-items-center">
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
								<QrCode className="size-5" />
							)}
						</motion.span>
					</AnimatePresence>
				</span>
			</Button>
			<Drawer open={open} onOpenChange={setOpen} showSwipeHandle>
				<DrawerContent className="max-h-[calc(100dvh-2rem)]">
					<DrawerHeader className="sr-only">
						<DrawerTitle>Share your page</DrawerTitle>
						<DrawerDescription>
							Scan this QR code to open your page.
						</DrawerDescription>
					</DrawerHeader>
					<div className="flex flex-col gap-6 p-5">
						<ShareLinkContent profileImageUrl={profileImageUrl} />
					</div>
				</DrawerContent>
			</Drawer>
		</>
	);
}
