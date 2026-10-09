"use client";

import { Button } from "@grabbin/ui/components/button";
import {
	Drawer,
	DrawerContent,
	DrawerDescription,
	DrawerHeader,
	DrawerTitle,
} from "@grabbin/ui/components/drawer";
import { useIsMobile } from "@grabbin/ui/components/use-mobile";
import { QrCode } from "lucide-react";
import { overlay } from "overlay-kit";
import ShareLinkContent from "../sharing/share-link-content";

export default function PublicShareLinkButton({
	profileImageUrl,
}: {
	profileImageUrl: string | null;
}) {
	const isMobile = useIsMobile();

	if (!isMobile) return null;

	return (
		<>
			<Button
				type="button"
				variant="default"
				size="icon-lg"
				className="fixed right-6 bottom-6 z-50 size-15 rounded-full"
				aria-label="Share link"
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
				<QrCode className="size-6" aria-hidden="true" />
			</Button>
		</>
	);
}
