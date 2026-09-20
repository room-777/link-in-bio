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
import {
	Avatar,
	AvatarFallback,
	AvatarImage,
} from "@grabbin/ui/components/avatar";
import { Button, buttonVariants } from "@grabbin/ui/components/button";
import {
	Popover,
	PopoverContent,
	PopoverTitle,
	PopoverTrigger,
} from "@grabbin/ui/components/popover";
import { Skeleton } from "@grabbin/ui/components/skeleton";
import { toast } from "@grabbin/ui/components/toast";
import { cn } from "@grabbin/ui/lib/utils";
import { SlidersHorizontal } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Activity, useEffect, useRef, useState } from "react";
import { CheckCircle } from "reicon-react/icons/CheckCircle";
import { InfoCircle } from "reicon-react/icons/InfoCircle";
import { apiClient, getApiErrorMessage } from "@/lib/api-client";
import { authClient, getAuthErrorMessage } from "@/lib/auth-client";
import { getSignInHref } from "@/lib/auth-redirect";
import { PageHandleForm } from "./create-page-form";

type DeleteActivity = "confirm" | "sent";

function OwnerFooter({
	handle,
	onHandleChange,
}: {
	handle?: string;
	onHandleChange?: (handle: string) => void;
}) {
	const router = useRouter();
	const reduceMotion = useReducedMotion();
	const { data: session } = authClient.useSession();
	const [activeItem, setActiveItem] = useState<number | null>(null);
	const [isItemActive, setIsItemActive] = useState(false);
	const [isHandlePopoverOpen, setIsHandlePopoverOpen] = useState(false);
	const [isOpen, setIsOpen] = useState(false);
	const [isSigningOut, setIsSigningOut] = useState(false);
	const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
	const [deleteActivity, setDeleteActivity] =
		useState<DeleteActivity>("confirm");
	const [deleteClickCount, setDeleteClickCount] = useState(0);
	const [isRequestingDelete, setIsRequestingDelete] = useState(false);
	const deleteResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
		null,
	);
	const hoverTransition = reduceMotion
		? { duration: 0 }
		: { type: "spring" as const, stiffness: 560, damping: 32, mass: 0.8 };
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
	async function handleSignOut() {
		setIsSigningOut(true);
		const { error } = await authClient.signOut();
		if (error) {
			setIsSigningOut(false);
			toast({ message: getAuthErrorMessage(error), state: "error" });
			return;
		}

		router.refresh();
	}

	async function handleChangeHandle(nextHandle: string) {
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

		setIsHandlePopoverOpen(false);
		setIsOpen(false);
		if (onHandleChange) {
			onHandleChange(body.page.handle);
		} else {
			router.replace(`/${encodeURIComponent(body.page.handle)}`);
		}
	}

	const resetDeleteDialog = () => {
		setDeleteActivity("confirm");
		setDeleteClickCount(0);
		setIsRequestingDelete(false);
	};

	const handleDeleteDialogChange = (open: boolean) => {
		if (deleteResetTimerRef.current) {
			clearTimeout(deleteResetTimerRef.current);
			deleteResetTimerRef.current = null;
		}

		setIsDeleteDialogOpen(open);
		if (open) {
			resetDeleteDialog();
			return;
		}

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

	return (
		<>
			<Popover
				open={isOpen}
				onOpenChange={(open) => {
					setIsOpen(open);
					if (!open) setIsHandlePopoverOpen(false);
				}}
			>
				<PopoverTrigger
					render={
						<Button
							variant="ghost"
							size="icon"
							className="size-10 text-muted-foreground/80"
							aria-label="Open page options"
						/>
					}
				>
					<SlidersHorizontal />
				</PopoverTrigger>
				<PopoverContent
					align="end"
					side="top"
					sideOffset={8}
					initialFocus={false}
					className="relative w-60 gap-1 rounded-2xl p-2"
					onPointerLeave={() => setIsItemActive(false)}
				>
					<PopoverTitle className="sr-only">Page options</PopoverTitle>
					{activeItem !== null && (
						<motion.div
							aria-hidden="true"
							initial={false}
							data-active={isItemActive || undefined}
							className="pointer-events-none absolute top-2 right-2 left-2 z-0 h-16 rounded-lg bg-muted/80 opacity-0 transition-opacity duration-150 data-[active=true]:opacity-100 motion-reduce:transition-none"
							animate={{ y: activeItem * 68 }}
							transition={hoverTransition}
						/>
					)}
					<Popover
						open={isHandlePopoverOpen}
						onOpenChange={setIsHandlePopoverOpen}
					>
						<PopoverTrigger
							render={
								<Button
									variant="ghost"
									className="relative z-10 h-16 w-full justify-start px-5 hover:bg-transparent"
									onPointerEnter={() => {
										setActiveItem(0);
										setIsItemActive(true);
									}}
									onFocus={() => {
										setActiveItem(0);
										setIsItemActive(true);
									}}
								/>
							}
						>
							<span className="flex flex-col items-start gap-0.5 text-left">
								<span>Change handle</span>
								<span className="w-full min-w-0 break-all text-muted-foreground/80 text-sm">
									{handle ? `/${handle}` : null}
								</span>
							</span>
						</PopoverTrigger>
						<PopoverContent
							side="left"
							align="center"
							sideOffset={0}
							initialFocus={false}
							className="smooth-shadow-ring-2xl! w-[min(21rem,calc(100vw-2rem))] rounded-2xl p-4"
						>
							<PopoverTitle className="sr-only">
								Change your handle
							</PopoverTitle>
							<PageHandleForm
								initialHandle={handle}
								title="Change your handle"
								description="Choose a new handle for your page."
								submitLabel="Change handle"
								compact
								onSubmit={handleChangeHandle}
							/>
						</PopoverContent>
					</Popover>
					<Button
						variant="ghost"
						className="relative z-10 h-16 w-full justify-start px-5 hover:bg-transparent"
						disabled={isSigningOut}
						onClick={handleSignOut}
						onPointerEnter={() => {
							setActiveItem(1);
							setIsItemActive(true);
						}}
						onFocus={() => {
							setActiveItem(1);
							setIsItemActive(true);
						}}
					>
						{isSigningOut ? "Logging out..." : "Log out"}
					</Button>
					<Button
						variant="ghost"
						className="relative z-10 h-16 w-full justify-start px-5 text-primary hover:bg-transparent"
						onClick={() => {
							setIsOpen(false);
							handleDeleteDialogChange(true);
						}}
						onPointerEnter={() => {
							setActiveItem(2);
							setIsItemActive(true);
						}}
						onFocus={() => {
							setActiveItem(2);
							setIsItemActive(true);
						}}
					>
						Delete account
					</Button>
				</PopoverContent>
			</Popover>
			<AlertDialog
				open={isDeleteDialogOpen}
				onOpenChange={handleDeleteDialogChange}
			>
				<AlertDialogContent className="aspect-square gap-0 overflow-hidden p-5">
					<Activity mode="visible">
						<div
							aria-hidden={deleteActivity !== "confirm"}
							className={cn(
								"col-start-1 row-start-1 flex flex-col gap-4 opacity-0 transition-opacity duration-200 ease-out motion-reduce:transition-none",
								deleteActivity === "confirm" && "opacity-100",
							)}
							inert={deleteActivity !== "confirm"}
						>
							<AlertDialogHeader>
								<span className="mb-2 self-start" aria-hidden="true">
									<InfoCircle
										weight="Filled"
										className="size-12 text-primary"
									/>
								</span>
								<AlertDialogTitle>Delete your account?</AlertDialogTitle>
								<AlertDialogDescription>
									Your account and all associated data will be permanently
									deleted. This action can&apos;t be undone.
								</AlertDialogDescription>
							</AlertDialogHeader>
							<AlertDialogFooter className="grow items-end rounded-b-xl border-0 bg-transparent">
								<AlertDialogCancel
									className={"min-w-0 flex-1 basis-0 whitespace-nowrap"}
									size={"xl"}
									variant={"outline"}
								>
									Cancel
								</AlertDialogCancel>
								<AlertDialogAction
									variant="destructive"
									size={"xl"}
									disabled={isRequestingDelete}
									onClick={handleDeleteAccount}
									aria-label={deleteButtonLabel}
									className={
										"relative min-w-0 flex-1 basis-0 overflow-hidden whitespace-nowrap motion-safe:active:scale-100"
									}
								>
									<span className="relative z-10">{deleteButtonLabel}</span>
									<span
										aria-hidden="true"
										className="pointer-events-none absolute inset-0 z-20 origin-left bg-destructive transition-transform duration-200 ease-out will-change-transform motion-reduce:transition-none"
										style={{ transform: `scaleX(${deleteProgress})` }}
									/>
									<span
										aria-hidden="true"
										className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center text-white"
										style={{
											clipPath: `inset(0 ${100 - deleteProgress * 100}% 0 0)`,
										}}
									>
										{deleteButtonLabel}
									</span>
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
								<span
									className="t-success-check mb-2 self-start"
									data-state={deleteActivity === "sent" ? "in" : "out"}
									aria-hidden="true"
								>
									<CheckCircle
										weight="Filled"
										className="size-12 text-brand-green"
									/>
								</span>
								<AlertDialogTitle>Check your inbox</AlertDialogTitle>
								<AlertDialogDescription>
									We sent a deletion link to{" "}
									<strong className="font-medium text-primary">
										{session?.user.email ?? "your email address"}
									</strong>
									. Open it to finish deleting your account.
								</AlertDialogDescription>
							</AlertDialogHeader>
							<AlertDialogFooter className="grow items-end rounded-b-xl border-0 bg-transparent">
								<AlertDialogCancel variant="outline" size={"xl"} className={""}>
									Okay, I got it
								</AlertDialogCancel>
							</AlertDialogFooter>
						</div>
					</Activity>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}

function ViewerFooter({ handle }: { handle?: string }) {
	const { data: session, isPending } = authClient.useSession();
	const [isHydrated, setIsHydrated] = useState(false);

	useEffect(() => setIsHydrated(true), []);

	if (!isHydrated || isPending) {
		return <Skeleton className="h-10 w-24" />;
	}

	if (!session) {
		return (
			<Link
				href={getSignInHref(handle ? `/${encodeURIComponent(handle)}` : null)}
				className={buttonVariants({
					variant: "ghost",
					size: "lg",
					className: "text-muted-foreground/80",
				})}
			>
				Sign in
			</Link>
		);
	}

	const name = session.user.name || session.user.email;
	const primaryPageHandle = (
		session.user as typeof session.user & { primaryPageHandle?: string | null }
	).primaryPageHandle;
	const pageHref = primaryPageHandle
		? `/${encodeURIComponent(primaryPageHandle)}`
		: "/create";

	return (
		<Link
			href={pageHref}
			className={cn(
				buttonVariants({ variant: "ghost", size: "lg" }),
				"max-w-full justify-start gap-2 px-2",
			)}
		>
			<Avatar size="sm" className={"data-[size=sm]:size-5"}>
				<AvatarImage
					src={session.user.image ?? undefined}
					alt=""
					className={"outline-depth"}
				/>
				<AvatarFallback />
			</Avatar>
			<span className="truncate text-muted-foreground/80 text-sm">{name}</span>
		</Link>
	);
}

export default function PageFooter({
	handle,
	isOwner,
	onHandleChange,
}: {
	handle?: string;
	isOwner: boolean;
	onHandleChange?: (handle: string) => void;
}) {
	return (
		<footer className="-mx-4 mb-4 flex min-h-10 items-center justify-start pt-8 min-[90rem]:-mx-2">
			{isOwner ? (
				<OwnerFooter handle={handle} onHandleChange={onHandleChange} />
			) : (
				<ViewerFooter handle={handle} />
			)}
		</footer>
	);
}
