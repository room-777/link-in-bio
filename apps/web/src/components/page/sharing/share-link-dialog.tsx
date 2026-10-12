"use client";

import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogTitle,
} from "@grabbin/ui/components/dialog";
import {
	Drawer,
	DrawerContent,
	DrawerDescription,
	DrawerHeader,
	DrawerTitle,
} from "@grabbin/ui/components/drawer";
import { overlay } from "overlay-kit";
import ShareLinkContent from "./share-link-content";

export function openShareLinkDialog(
	profileImageUrl: string | null,
	isMobile: boolean,
) {
	overlay.open(({ isOpen, close, unmount }) => {
		const overlayProps = {
			open: isOpen,
			onOpenChange: (nextOpen: boolean) => !nextOpen && close(),
			onOpenChangeComplete: (nextOpen: boolean) => !nextOpen && unmount(),
		};

		return isMobile ? (
			<Drawer {...overlayProps} showSwipeHandle>
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
		) : (
			<Dialog {...overlayProps}>
				<DialogContent
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
		);
	});
}
