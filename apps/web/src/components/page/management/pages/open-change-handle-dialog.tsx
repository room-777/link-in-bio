"use client";

import { Dialog, DialogContent } from "@grabbin/ui/components/dialog";
import {
	Drawer,
	DrawerContent,
	DrawerDescription,
	DrawerHeader,
	DrawerTitle,
} from "@grabbin/ui/components/drawer";
import { overlay } from "overlay-kit";
import ChangeHandleDialog from "./change-handle-dialog";

export function openChangeHandleDialog(
	handle: string | undefined,
	onHandleChange: ((handle: string) => void) | undefined,
	isMobile: boolean,
) {
	overlay.open(({ isOpen, close, unmount }) => {
		const overlayProps = {
			open: isOpen,
			onOpenChange: (nextOpen: boolean) => !nextOpen && close(),
			onOpenChangeComplete: (nextOpen: boolean) => !nextOpen && unmount(),
		};

		if (isMobile) {
			return (
				<Drawer {...overlayProps} showSwipeHandle>
					<DrawerContent className="max-h-[calc(100dvh-2rem)]">
						<DrawerHeader className="sr-only">
							<DrawerTitle>Change your handle</DrawerTitle>
							<DrawerDescription>
								Choose a new handle for your page.
							</DrawerDescription>
						</DrawerHeader>
						<div className="min-h-0 overflow-y-auto p-5 [&_h1]:font-heading [&_h1]:font-medium [&_h1]:text-base [&_p]:text-muted-foreground [&_p]:text-sm">
							<ChangeHandleDialog
								handle={handle}
								onHandleChange={onHandleChange}
								onClose={close}
								compact={false}
							/>
						</div>
					</DrawerContent>
				</Drawer>
			);
		}

		return (
			<Dialog {...overlayProps}>
				<DialogContent
					showCloseButton={false}
					className="smooth-shadow-md aspect-square gap-0 overflow-hidden p-5 ring-0"
				>
					<div className="flex h-full min-h-0 min-w-0 flex-col overflow-y-auto p-0">
						<div className="h-full min-h-0 min-w-0 p-1">
							<ChangeHandleDialog
								handle={handle}
								onHandleChange={onHandleChange}
								onClose={close}
								compact
							/>
						</div>
					</div>
				</DialogContent>
			</Dialog>
		);
	});
}
