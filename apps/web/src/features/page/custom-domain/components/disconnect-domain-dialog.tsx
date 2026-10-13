"use client";

import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@grabbin/ui/components/alert-dialog";
import { useState } from "react";

export default function DisconnectDomainDialog({
	hostname,
	open,
	onClose,
	onUnmount,
	onDisconnect,
}: {
	hostname: string;
	open: boolean;
	onClose: () => void;
	onUnmount: () => void;
	onDisconnect: () => Promise<void>;
}) {
	const [isDisconnecting, setIsDisconnecting] = useState(false);

	const confirmDisconnect = async (event: React.MouseEvent) => {
		event.preventDefault();
		setIsDisconnecting(true);
		try {
			await onDisconnect();
			onClose();
		} catch {
			// The mutation reports its error through the shared toast.
		} finally {
			setIsDisconnecting(false);
		}
	};

	return (
		<AlertDialog
			open={open}
			onOpenChange={(nextOpen) => !nextOpen && onClose()}
			onOpenChangeComplete={(nextOpen) => !nextOpen && onUnmount()}
		>
			<AlertDialogContent
				overlayProps={{ forceRender: true, className: "z-[60]" }}
				className="z-[70] gap-0 overflow-hidden p-5"
			>
				<div className="flex h-full w-full min-w-0 flex-col gap-4">
					<AlertDialogHeader>
						<AlertDialogTitle>Disconnect custom domain?</AlertDialogTitle>
						<AlertDialogDescription>
							<span className="font-medium text-primary">{hostname}</span> will
							stop opening this page. You can connect it again later.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter className="mx-0 mt-auto w-full! flex-col-reverse! items-end rounded-b-xl border-0 bg-transparent px-0 sm:justify-end">
						<AlertDialogCancel
							className="w-full min-w-0 whitespace-nowrap sm:max-w-36"
							size="xl"
							variant="outline"
							disabled={isDisconnecting}
						>
							Cancel
						</AlertDialogCancel>
						<AlertDialogAction
							variant="destructive"
							size="xl"
							disabled={isDisconnecting}
							onClick={(event) => void confirmDisconnect(event)}
							className="relative w-full min-w-0 overflow-hidden whitespace-nowrap bg-destructive text-white hover:bg-destructive/80 motion-safe:active:scale-100 sm:max-w-36"
						>
							{isDisconnecting && "Disconnecting…"}
							{!isDisconnecting && "Disconnect"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</div>
			</AlertDialogContent>
		</AlertDialog>
	);
}

export { DisconnectDomainDialog };
