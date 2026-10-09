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
import { QrCode } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { overlay } from "overlay-kit";
import ShareLinkContent from "../sharing/share-link-content";

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
				onClick={() =>
					overlay.open(({ isOpen, close, unmount }) => (
						<Drawer
							open={isOpen}
							showSwipeHandle
							onOpenChange={(nextOpen) => !nextOpen && close()}
							onOpenChangeComplete={(nextOpen) => !nextOpen && unmount()}
						>
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
					))
				}
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
