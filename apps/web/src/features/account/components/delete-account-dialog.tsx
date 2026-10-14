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
import { Button } from "@grabbin/ui/components/button";
import {
	Drawer,
	DrawerClose,
	DrawerContent,
	DrawerDescription,
	DrawerFooter,
	DrawerHeader,
	DrawerTitle,
} from "@grabbin/ui/components/drawer";
import Loading from "@grabbin/ui/components/loading";
import { toast } from "@grabbin/ui/components/toast";
import { useIsMobile } from "@grabbin/ui/components/use-mobile";
import { cn } from "@grabbin/ui/lib/utils";
import { Activity } from "react";
import { CheckCircle } from "reicon-react/icons/CheckCircle";
import { authClient } from "@/lib/auth-client";
import { useDeleteAccount } from "../hooks/use-delete-account";

type DeleteAccountDialogProps = {
	onOpenChange: (open: boolean) => void;
	onOpenChangeComplete: (open: boolean) => void;
	open: boolean;
};

export default function DeleteAccountDialog({
	onOpenChange,
	onOpenChangeComplete,
	open,
}: DeleteAccountDialogProps) {
	const isMobile = useIsMobile();
	const { data: session } = authClient.useSession();
	const deleteAccount = useDeleteAccount(open);

	const handleOpenChange = (nextOpen: boolean) => {
		deleteAccount.handleOpenChange(nextOpen);
		onOpenChange(nextOpen);
	};

	const handleDeleteAccount = async () => {
		const errorMessage = await deleteAccount.handleDeleteAccount();
		if (errorMessage) toast({ message: errorMessage, state: "error" });
	};
	const deleteProgress = Math.min(deleteAccount.clickCount, 3) / 3;
	const deleteButtonLabel = deleteAccount.isRequesting
		? "Sending link…"
		: deleteAccount.clickCount === 0
			? "Delete"
			: deleteAccount.clickCount === 1
				? "Click again"
				: deleteAccount.clickCount === 2
					? "One more time"
					: "Delete anyway";
	const deleteActivity = deleteAccount.activity;
	const isRequestingDelete = deleteAccount.isRequesting;

	return isMobile ? (
		<Drawer
			open={open}
			onOpenChange={handleOpenChange}
			onOpenChangeComplete={onOpenChangeComplete}
			showSwipeHandle
		>
			<DrawerContent className="h-fit! max-h-[calc(100dvh-2rem)]">
				<Activity mode="visible">
					<div
						aria-hidden={deleteActivity !== "confirm"}
						className={cn(
							"flex w-full min-w-0 flex-col gap-4 p-5 opacity-0 transition-opacity duration-200 ease-out motion-reduce:transition-none",
							deleteActivity === "confirm" && "opacity-100",
							deleteActivity !== "confirm" && "hidden",
						)}
						inert={deleteActivity !== "confirm"}
					>
						<DrawerHeader className="p-0 text-left">
							<DrawerTitle>Delete your account?</DrawerTitle>
							<DrawerDescription>
								Your account and all associated data will be permanently
								deleted. This action can&apos;t be undone.
							</DrawerDescription>
						</DrawerHeader>
						<DrawerFooter className="!mt-0 p-0 pt-6">
							<Button
								variant="destructive"
								size="xl"
								disabled={isRequestingDelete}
								onClick={handleDeleteAccount}
								aria-label={deleteButtonLabel}
								className="relative w-full min-w-0 overflow-hidden whitespace-nowrap bg-destructive text-white hover:bg-destructive/80 motion-safe:active:scale-100"
							>
								<DeleteButtonContent
									label={deleteButtonLabel}
									disabled={isRequestingDelete}
									progress={deleteProgress}
								/>
							</Button>
							<DrawerClose
								render={
									<Button
										className="w-full min-w-0 whitespace-nowrap"
										size="xl"
										variant="outline"
									/>
								}
							>
								Cancel
							</DrawerClose>
						</DrawerFooter>
					</div>
				</Activity>
				<Activity mode="visible">
					<div
						aria-hidden={deleteActivity !== "sent"}
						className={cn(
							"flex flex-col gap-4 p-5 opacity-0 transition-opacity duration-200 ease-out motion-reduce:transition-none",
							deleteActivity === "sent" && "opacity-100",
							deleteActivity !== "sent" && "hidden",
						)}
						inert={deleteActivity !== "sent"}
					>
						<DrawerHeader className="p-0 text-left">
							<SuccessIcon active={deleteActivity === "sent"} />
							<DrawerTitle>Check your inbox</DrawerTitle>
							<DrawerDescription className="mt-2">
								<p>
									We sent a deletion link to{" "}
									<strong className="font-medium text-primary">
										{session?.user.email ?? "your email address"}.
									</strong>
								</p>
								<p>Open it to finish deleting your account.</p>
							</DrawerDescription>
						</DrawerHeader>
						<DrawerFooter className="!mt-0 p-0 pt-6">
							<DrawerClose render={<Button variant="outline" size="xl" />}>
								Okay, I got it
							</DrawerClose>
						</DrawerFooter>
					</div>
				</Activity>
			</DrawerContent>
		</Drawer>
	) : (
		<AlertDialog
			open={open}
			onOpenChange={handleOpenChange}
			onOpenChangeComplete={onOpenChangeComplete}
		>
			<AlertDialogContent className="aspect-square gap-0 overflow-hidden p-5">
				<Activity mode="visible">
					<div
						aria-hidden={deleteActivity !== "confirm"}
						className={cn(
							"col-start-1 row-start-1 flex h-full w-full min-w-0 flex-col gap-4 opacity-0 transition-opacity duration-200 ease-out motion-reduce:transition-none",
							deleteActivity === "confirm" && "opacity-100",
						)}
						inert={deleteActivity !== "confirm"}
					>
						<AlertDialogHeader>
							<AlertDialogTitle>Delete your account?</AlertDialogTitle>
							<AlertDialogDescription>
								Your account and all associated data will be permanently
								deleted. This action can&apos;t be undone.
							</AlertDialogDescription>
						</AlertDialogHeader>
						<AlertDialogFooter className="mx-0 mt-auto w-full! flex-col-reverse! items-end rounded-b-xl border-0 bg-transparent px-0 sm:justify-end">
							<AlertDialogCancel
								className="w-full min-w-0 whitespace-nowrap sm:max-w-36"
								size="xl"
								variant="outline"
							>
								Cancel
							</AlertDialogCancel>
							<AlertDialogAction
								variant="destructive"
								size="xl"
								disabled={isRequestingDelete}
								onClick={handleDeleteAccount}
								aria-label={deleteButtonLabel}
								className="relative w-full min-w-0 overflow-hidden whitespace-nowrap bg-destructive text-white hover:bg-destructive/80 motion-safe:active:scale-100 sm:max-w-36"
							>
								<DeleteButtonContent
									label={deleteButtonLabel}
									disabled={isRequestingDelete}
									progress={deleteProgress}
								/>
							</AlertDialogAction>
						</AlertDialogFooter>
					</div>
				</Activity>
				<Activity mode="visible">
					<div
						aria-hidden={deleteActivity !== "sent"}
						className={cn(
							"col-start-1 row-start-1 flex flex-col gap-4 opacity-0 transition-opacity duration-200 ease-out motion-reduce:transition-none",
							deleteActivity === "sent" && "opacity-100",
						)}
						inert={deleteActivity !== "sent"}
					>
						<AlertDialogHeader>
							<SuccessIcon active={deleteActivity === "sent"} />
							<AlertDialogTitle>Check your inbox</AlertDialogTitle>
							<AlertDialogDescription className="mt-2 sm:mt-0">
								<p>
									We sent a deletion link to{" "}
									<strong className="font-medium text-primary">
										{session?.user.email ?? "your email address"}.
									</strong>
								</p>
								<p>Open it to finish deleting your account.</p>
							</AlertDialogDescription>
						</AlertDialogHeader>
						<AlertDialogFooter className="grow items-end rounded-b-xl border-0 bg-transparent">
							<AlertDialogCancel variant="outline" size="xl">
								Okay, I got it
							</AlertDialogCancel>
						</AlertDialogFooter>
					</div>
				</Activity>
			</AlertDialogContent>
		</AlertDialog>
	);
}

function DeleteButtonContent({
	disabled,
	label,
	progress,
}: {
	disabled: boolean;
	label: string;
	progress: number;
}) {
	return (
		<>
			<span className="relative z-10 inline-flex items-center gap-2">
				{disabled && <Loading aria-hidden="true" className="size-4" />}
				<span>{label}</span>
			</span>
			{!disabled && (
				<span
					aria-hidden="true"
					className="pointer-events-none absolute inset-x-3 bottom-1 z-20 h-1 overflow-hidden rounded-full bg-white/25"
				>
					<span
						className="block h-full origin-left rounded-full bg-white transition-transform duration-200 ease-out will-change-transform motion-reduce:transition-none"
						style={{ transform: `scaleX(${progress})` }}
					/>
				</span>
			)}
		</>
	);
}

function SuccessIcon({ active }: { active: boolean }) {
	return (
		<span
			className="t-success-check mb-2 self-start"
			data-state={active ? "in" : "out"}
			aria-hidden="true"
		>
			<CheckCircle weight="Filled" className="size-12 text-brand-green" />
		</span>
	);
}
