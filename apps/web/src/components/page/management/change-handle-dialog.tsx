"use client";

import { Dialog, DialogContent } from "@grabbin/ui/components/dialog";
import {
	Drawer,
	DrawerContent,
	DrawerDescription,
	DrawerHeader,
	DrawerTitle,
} from "@grabbin/ui/components/drawer";
import { useIsMobile } from "@grabbin/ui/components/use-mobile";
import { useRouter } from "next/navigation";
import { overlay } from "overlay-kit";
import { apiClient, getApiErrorMessage } from "@/lib/api-client";
import { PageHandleForm } from "./create-page-form";

type ChangeHandleDialogProps = {
	handle?: string;
	onHandleChange?: (handle: string) => void;
	onOpenChange: (open: boolean) => void;
	open: boolean;
	onOpenChangeComplete: (open: boolean) => void;
};

export default function ChangeHandleDialog({
	handle,
	onHandleChange,
	onOpenChange,
	onOpenChangeComplete,
	open,
}: ChangeHandleDialogProps) {
	const router = useRouter();
	const isMobile = useIsMobile();

	const handleChange = async (nextHandle: string) => {
		if (!handle) throw new Error("Please try again.");
		const response = await apiClient.pages[":handle"].handle.$patch(
			{ param: { handle } },
			{
				init: {
					body: JSON.stringify({ handle: nextHandle }),
					headers: { "Content-Type": "application/json" },
				},
			},
		);
		if (!response.ok) throw new Error(await getApiErrorMessage(response));

		const body = await response.json();
		if (
			!("page" in body) ||
			!body.page ||
			typeof body.page !== "object" ||
			!("handle" in body.page) ||
			typeof body.page.handle !== "string"
		) {
			throw new Error("Please try again.");
		}

		onOpenChange(false);
		if (onHandleChange) {
			onHandleChange(body.page.handle);
		} else {
			router.replace(`/${encodeURIComponent(body.page.handle)}`);
		}
	};

	const renderForm = (compact: boolean) => (
		<PageHandleForm
			initialHandle={handle}
			title="Change your handle"
			description="Choose a new handle for your page."
			submitLabel="Change handle"
			variant="outline"
			compact={compact}
			layoutClassName={compact ? "justify-between" : undefined}
			onSubmit={handleChange}
		/>
	);

	return isMobile ? (
		<Drawer
			open={open}
			onOpenChange={onOpenChange}
			onOpenChangeComplete={onOpenChangeComplete}
			showSwipeHandle
		>
			<DrawerContent className="max-h-[calc(100dvh-2rem)]">
				<DrawerHeader className="sr-only">
					<DrawerTitle>Change your handle</DrawerTitle>
					<DrawerDescription>
						Choose a new handle for your page.
					</DrawerDescription>
				</DrawerHeader>
				<div className="min-h-0 overflow-y-auto p-5 [&_h1]:font-heading [&_h1]:font-medium [&_h1]:text-base [&_p]:text-muted-foreground [&_p]:text-sm">
					{renderForm(false)}
				</div>
			</DrawerContent>
		</Drawer>
	) : (
		<Dialog
			open={open}
			onOpenChange={onOpenChange}
			onOpenChangeComplete={onOpenChangeComplete}
		>
			<DialogContent
				showCloseButton={false}
				className="smooth-shadow-md aspect-square gap-0 overflow-hidden p-5 ring-0"
			>
				<div className="flex h-full min-h-0 min-w-0 flex-col overflow-y-auto p-0">
					<div className="h-full min-h-0 min-w-0 p-1">{renderForm(true)}</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}

export function openChangeHandleDialog(
	handle?: string,
	onHandleChange?: (handle: string) => void,
) {
	overlay.open(({ isOpen, close, unmount }) => (
		<ChangeHandleDialog
			handle={handle}
			onHandleChange={onHandleChange}
			open={isOpen}
			onOpenChange={(nextOpen) => !nextOpen && close()}
			onOpenChangeComplete={(nextOpen) => !nextOpen && unmount()}
		/>
	));
}
