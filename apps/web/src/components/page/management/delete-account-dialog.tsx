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
import { useReducedMotion } from "motion/react";
import { overlay } from "overlay-kit";
import { Activity, useEffect, useRef, useState } from "react";
import { CheckCircle } from "reicon-react/icons/CheckCircle";
import { authClient, getAuthErrorMessage } from "@/lib/auth-client";

type DeleteActivity = "confirm" | "sent";

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
	const reduceMotion = useReducedMotion();
	const isMobile = useIsMobile();
	const { data: session } = authClient.useSession();
	const [deleteActivity, setDeleteActivity] =
		useState<DeleteActivity>("confirm");
	const [deleteClickCount, setDeleteClickCount] = useState(0);
	const [isRequestingDelete, setIsRequestingDelete] = useState(false);
	const deleteResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
		null,
	);
	const deleteProgress = Math.min(deleteClickCount, 3) / 3;
	const deleteButtonLabel = isRequestingDelete
		? "Sending link…"
		: deleteClickCount === 0
			? "Delete"
			: deleteClickCount === 1
				? "Click again"
				: deleteClickCount === 2
					? "One more time"
					: "Delete anyway";

	const resetDeleteDialog = () => {
		setDeleteActivity("confirm");
		setDeleteClickCount(0);
		setIsRequestingDelete(false);
	};

	useEffect(() => {
		if (!open) return;
		setDeleteActivity("confirm");
		setDeleteClickCount(0);
		setIsRequestingDelete(false);
	}, [open]);

	useEffect(() => {
		return () => {
			if (deleteResetTimerRef.current) {
				clearTimeout(deleteResetTimerRef.current);
			}
		};
	}, []);

	const handleOpenChange = (nextOpen: boolean) => {
		if (deleteResetTimerRef.current) {
			clearTimeout(deleteResetTimerRef.current);
			deleteResetTimerRef.current = null;
		}

		onOpenChange(nextOpen);
		if (nextOpen) return;

		setIsRequestingDelete(false);
		deleteResetTimerRef.current = setTimeout(
			resetDeleteDialog,
			reduceMotion ? 0 : 150,
		);
	};

	const handleDeleteAccount = async () => {
		const nextClickCount = deleteClickCount + 1;
		setDeleteClickCount(nextClickCount);
		if (nextClickCount < 4) return;

		setIsRequestingDelete(true);
		const { error } = await authClient.deleteUser({
			callbackURL: window.location.origin,
		});
		setIsRequestingDelete(false);

		if (error) {
			toast({ message: getAuthErrorMessage(error), state: "error" });
			return;
		}

		setDeleteActivity("sent");
	};

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

export function openDeleteAccountDialog() {
	overlay.open(({ isOpen, close, unmount }) => (
		<DeleteAccountDialog
			open={isOpen}
			onOpenChange={(nextOpen) => !nextOpen && close()}
			onOpenChangeComplete={(nextOpen) => !nextOpen && unmount()}
		/>
	));
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
