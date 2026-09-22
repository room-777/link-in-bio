"use client";

import {
	Avatar,
	AvatarFallback,
	AvatarImage,
} from "@grabbin/ui/components/avatar";
import { Button, buttonVariants } from "@grabbin/ui/components/button";
import Loading from "@grabbin/ui/components/loading";
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
import { useEffect, useState } from "react";
import { authClient, getAuthErrorMessage } from "@/lib/auth-client";
import { getSignInHref } from "@/lib/auth-redirect";
import ChangeHandleDialog from "./change-handle-dialog";
import DeleteAccountDialog from "./delete-account-dialog";

function OwnerFooter({
	handle,
	onHandleChange,
	isSaving,
}: {
	handle?: string;
	onHandleChange?: (handle: string) => void;
	isSaving?: boolean;
}) {
	const router = useRouter();
	const reduceMotion = useReducedMotion();
	const [activeItem, setActiveItem] = useState<number | null>(null);
	const [isItemActive, setIsItemActive] = useState(false);
	const [isHandleDialogOpen, setIsHandleDialogOpen] = useState(false);
	const [isOpen, setIsOpen] = useState(false);
	const [isSigningOut, setIsSigningOut] = useState(false);
	const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
	const hoverTransition = reduceMotion
		? { duration: 0 }
		: { type: "spring" as const, stiffness: 560, damping: 32, mass: 0.8 };
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

	return (
		<>
			<Popover
				open={isOpen}
				onOpenChange={(open) => {
					setIsOpen(open);
				}}
			>
				<PopoverTrigger
					render={
						<Button
							variant="ghost"
							size="icon-lg"
							className="text-muted-foreground/80"
							aria-label="Open page options"
						/>
					}
				>
					<SlidersHorizontal className="stroke-[2.5px]" />
				</PopoverTrigger>
				<PopoverContent
					align="start"
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
					<Button
						variant="ghost"
						className="relative z-10 h-16 w-full justify-start px-5 hover:bg-transparent"
						onClick={() => {
							setIsOpen(false);
							setIsHandleDialogOpen(true);
						}}
						onPointerEnter={() => {
							setActiveItem(0);
							setIsItemActive(true);
						}}
						onFocus={() => {
							setActiveItem(0);
							setIsItemActive(true);
						}}
					>
						<span className="flex flex-col items-start gap-0.5 text-left">
							<span>Change handle</span>
							<span className="w-full min-w-0 break-all text-muted-foreground/80 text-sm">
								{handle ? `/${handle}` : null}
							</span>
						</span>
					</Button>
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
							setIsDeleteDialogOpen(true);
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
			{isSaving && (
				<span
					className="ml-2 flex items-center gap-2 text-muted-foreground/80 text-xs"
					role="status"
					aria-live="polite"
				>
					<Loading aria-hidden="true" className="size-4" />
					Saving...
				</span>
			)}
			<ChangeHandleDialog
				handle={handle}
				onHandleChange={onHandleChange}
				onOpenChange={setIsHandleDialogOpen}
				open={isHandleDialogOpen}
			/>
			<DeleteAccountDialog
				onOpenChange={setIsDeleteDialogOpen}
				open={isDeleteDialogOpen}
			/>
		</>
	);
}

function ViewerFooter({ handle }: { handle?: string }) {
	const { data: session, isPending } = authClient.useSession();
	const [isHydrated, setIsHydrated] = useState(false);

	useEffect(() => setIsHydrated(true), []);

	if (!isHydrated || isPending) return <Skeleton className="h-10 w-24" />;

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
	isSaving,
}: {
	handle?: string;
	isOwner: boolean;
	onHandleChange?: (handle: string) => void;
	isSaving?: boolean;
}) {
	return (
		<footer className="-mx-4 mb-4 flex min-h-10 items-center justify-start pt-8 min-[90rem]:fixed min-[90rem]:bottom-6 min-[90rem]:left-16 min-[90rem]:z-30 min-[90rem]:-mx-2">
			{isOwner ? (
				<OwnerFooter
					handle={handle}
					onHandleChange={onHandleChange}
					isSaving={isSaving}
				/>
			) : (
				<ViewerFooter handle={handle} />
			)}
		</footer>
	);
}
