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
import { type MouseEvent, useState } from "react";

export default function DeletePageDialog({
	handle,
	open,
	onClose,
	onUnmount,
	onConfirm,
}: {
	handle: string;
	open: boolean;
	onClose: () => void;
	onUnmount: () => void;
	onConfirm: () => Promise<boolean>;
}) {
	const [isDeleting, setIsDeleting] = useState(false);
	const confirm = async (event: MouseEvent) => {
		event.preventDefault();
		setIsDeleting(true);
		const deleted = await onConfirm();
		setIsDeleting(false);
		if (deleted) onClose();
	};

	return (
		<AlertDialog
			open={open}
			onOpenChange={(nextOpen) => !nextOpen && !isDeleting && onClose()}
			onOpenChangeComplete={(nextOpen) => !nextOpen && onUnmount()}
		>
			<AlertDialogContent
				overlayProps={{ forceRender: true, className: "z-[60]" }}
				className="z-[70] gap-0 overflow-hidden p-5"
			>
				<div className="flex h-full w-full min-w-0 flex-col gap-4">
					<AlertDialogHeader>
						<AlertDialogTitle>Delete this page?</AlertDialogTitle>
						<AlertDialogDescription>
							This will permanently delete{" "}
							<span className="font-medium text-primary">/{handle}</span> and
							its content. This action can&apos;t be undone.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter className="mx-0 mt-auto w-full! flex-col-reverse! items-end rounded-b-xl border-0 bg-transparent px-0 sm:justify-end">
						<AlertDialogCancel
							className="w-full min-w-0 whitespace-nowrap sm:max-w-36"
							size="xl"
							variant="outline"
							disabled={isDeleting}
						>
							Cancel
						</AlertDialogCancel>
						<AlertDialogAction
							variant="destructive"
							size="xl"
							disabled={isDeleting}
							onClick={(event) => void confirm(event)}
							className="relative w-full min-w-0 overflow-hidden whitespace-nowrap bg-destructive text-white hover:bg-destructive/80 motion-safe:active:scale-100 sm:max-w-36"
						>
							{isDeleting ? "Deleting…" : "Delete page"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</div>
			</AlertDialogContent>
		</AlertDialog>
	);
}
