"use client";

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
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@grabbin/ui/components/tooltip";
import { cn } from "@grabbin/ui/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { SlidersHorizontal } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ComponentPropsWithoutRef } from "react";
import { forwardRef, useEffect, useState } from "react";
import { authClient, getAuthErrorMessage } from "@/lib/auth-client";
import { getSignInHref } from "@/lib/auth-redirect";
import { getPublicViewsQueryOptions } from "@/lib/public-views-api";
import ChangeHandleDialog from "./change-handle-dialog";
import DeleteAccountDialog from "./delete-account-dialog";
import ManagePagesDialog from "./manage-pages-dialog";
import SpinningCounter from "./spinning-counter";

type DiscordLinkProps = ComponentPropsWithoutRef<"a">;

const DiscordLink = forwardRef<HTMLAnchorElement, DiscordLinkProps>(
	function DiscordLink({ className, ...props }, ref) {
		return (
			<a
				{...props}
				ref={ref}
				href="https://discord.com/invite/U4NNF9hMms"
				target="_blank"
				rel="noreferrer"
				aria-label="Join the Discord community"
				className={buttonVariants({
					variant: "ghost",
					size: "icon-lg",
					className: cn("text-muted-foreground/80", className),
				})}
			>
				<svg
					viewBox="0 0 256 199"
					preserveAspectRatio="xMidYMid"
					aria-hidden="true"
				>
					<path
						d="M216.856 16.597A208.502 208.502 0 0 0 164.042 0c-2.275 4.113-4.933 9.645-6.766 14.046-19.692-2.961-39.203-2.961-58.533 0-1.832-4.4-4.55-9.933-6.846-14.046a207.809 207.809 0 0 0-52.855 16.638C5.618 67.147-3.443 116.4 1.087 164.956c22.169 16.555 43.653 26.612 64.775 33.193A161.094 161.094 0 0 0 79.735 175.3a136.413 136.413 0 0 1-21.846-10.632 108.636 108.636 0 0 0 5.356-4.237c42.122 19.702 87.89 19.702 129.51 0a131.66 131.66 0 0 0 5.355 4.237 136.07 136.07 0 0 1-21.886 10.653c4.006 8.02 8.638 15.67 13.873 22.848 21.142-6.58 42.646-16.637 64.815-33.213 5.316-56.288-9.08-105.09-38.056-148.36ZM85.474 135.095c-12.645 0-23.015-11.805-23.015-26.18s10.149-26.2 23.015-26.2c12.867 0 23.236 11.804 23.015 26.2.02 14.375-10.148 26.18-23.015 26.18Zm85.051 0c-12.645 0-23.014-11.805-23.014-26.18s10.148-26.2 23.014-26.2 23.236 11.804 23.015 26.2c0 14.375-10.148 26.18-23.015 26.18Z"
						fill="currentColor"
					/>
				</svg>
				<span className="sr-only">Join the Discord community</span>
			</a>
		);
	},
);

function DiscordTooltip() {
	return (
		<Tooltip>
			<TooltipTrigger delay={0} render={<DiscordLink />} />
			<TooltipContent>community</TooltipContent>
		</Tooltip>
	);
}

function PublicViews({ handle }: { handle?: string }) {
	const [timezone, setTimezone] = useState<string | null>(null);
	useEffect(() => {
		setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC");
	}, []);

	const { data, isPending, isError } = useQuery({
		...getPublicViewsQueryOptions(handle ?? "", timezone ?? "UTC"),
		enabled: Boolean(handle && timezone),
	});

	if (!handle) return null;
	if (timezone === null || isPending) {
		return <Skeleton aria-busy="true" className="h-8 w-28 rounded-md" />;
	}
	if (isError || !data) return null;

	const todayViews = data.todayViews ?? 0;
	const yesterdayViews = data.yesterdayViews ?? 0;
	const formatViews = (views: number) => {
		if (views >= 1_000_000)
			return { value: Math.floor(views / 1_000_000), unit: "M" };
		if (views >= 1_000) return { value: Math.floor(views / 1_000), unit: "K" };
		return { value: views, unit: "" };
	};
	const today = formatViews(todayViews);
	const yesterday = formatViews(yesterdayViews);

	return (
		<Tooltip>
			<TooltipTrigger
				delay={0}
				render={
					<Button
						variant="ghost"
						size="lg"
						className="px-2 text-muted-foreground/80"
						aria-label={`${todayViews} views today`}
					/>
				}
			>
				<SpinningCounter value={today.value} />
				{today.unit}
				<span className="ml-0">views today</span>
			</TooltipTrigger>
			<TooltipContent>{`${yesterday.value}${yesterday.unit} views yesterday`}</TooltipContent>
		</Tooltip>
	);
}

function OwnerFooter({
	handle,
	onHandleChange,
}: {
	handle?: string;
	onHandleChange?: (handle: string) => void;
}) {
	const router = useRouter();
	const reduceMotion = useReducedMotion();
	const [activeItem, setActiveItem] = useState<number | null>(null);
	const [isItemActive, setIsItemActive] = useState(false);
	const [isHandleDialogOpen, setIsHandleDialogOpen] = useState(false);
	const [isManagePagesOpen, setIsManagePagesOpen] = useState(false);
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
			<div className="flex items-center gap-1">
				<Popover
					open={isOpen}
					onOpenChange={(open) => {
						setIsOpen(open);
					}}
				>
					<Tooltip>
						<TooltipTrigger
							delay={0}
							render={
								<PopoverTrigger
									render={
										<Button
											variant="ghost"
											size="icon-lg"
											className="text-muted-foreground/80"
											aria-label="Open page options"
										>
											<SlidersHorizontal className="stroke-[2.5px]" />
										</Button>
									}
								/>
							}
						/>
						<TooltipContent>setting</TooltipContent>
					</Tooltip>
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
							onClick={() => {
								setIsOpen(false);
								setIsManagePagesOpen(true);
							}}
							onPointerEnter={() => {
								setActiveItem(1);
								setIsItemActive(true);
							}}
							onFocus={() => {
								setActiveItem(1);
								setIsItemActive(true);
							}}
						>
							Manage pages
						</Button>
						<Button
							variant="ghost"
							className="relative z-10 h-16 w-full justify-start px-5 hover:bg-transparent"
							disabled={isSigningOut}
							onClick={handleSignOut}
							onPointerEnter={() => {
								setActiveItem(2);
								setIsItemActive(true);
							}}
							onFocus={() => {
								setActiveItem(2);
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
								setActiveItem(3);
								setIsItemActive(true);
							}}
							onFocus={() => {
								setActiveItem(3);
								setIsItemActive(true);
							}}
						>
							Delete account
						</Button>
					</PopoverContent>
				</Popover>
				<DiscordTooltip />
				<PublicViews handle={handle} />
			</div>
			<ChangeHandleDialog
				handle={handle}
				onHandleChange={onHandleChange}
				onOpenChange={setIsHandleDialogOpen}
				open={isHandleDialogOpen}
			/>
			<ManagePagesDialog
				open={isManagePagesOpen}
				onOpenChange={setIsManagePagesOpen}
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

	if (!isHydrated || isPending) return <Skeleton className="h-8 w-16" />;

	if (!session) {
		return (
			<div className="flex items-center gap-1">
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
				<DiscordTooltip />
				<PublicViews handle={handle} />
			</div>
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
		<div className="flex items-center gap-1">
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
				<span className="truncate text-muted-foreground/80 text-sm">
					{name}
				</span>
			</Link>
			<DiscordTooltip />
			<PublicViews handle={handle} />
		</div>
	);
}

export function MadeWithGrabbinBadge({
	hasProAccess,
}: {
	hasProAccess?: boolean;
}) {
	const { data: session, isPending } = authClient.useSession();
	if (hasProAccess ?? (isPending || session?.plan.hasAccess)) return null;

	return (
		<span className="cursor-pointer rounded-sm bg-brand-black px-3 py-1.5 font-medium text-primary-foreground text-sm outline-depth">
			<span className="shimmer shimmer-color-blue-500/60 shimmer-duration-5500">
				made with grabbin
			</span>
		</span>
	);
}

export default function PageFooter({
	handle,
	isOwner,
	onHandleChange,
	hasProAccess,
}: {
	handle?: string;
	isOwner: boolean;
	onHandleChange?: (handle: string) => void;
	hasProAccess?: boolean;
}) {
	return (
		<footer className="-mx-4 mb-4 flex min-h-10 w-full flex-col items-center justify-start gap-2 py-12 min-[90rem]:fixed min-[90rem]:bottom-6 min-[90rem]:left-16 min-[90rem]:z-30 min-[90rem]:-mx-2 min-[90rem]:w-auto min-[90rem]:items-start min-[90rem]:py-0">
			<div className="hidden min-[90rem]:block">
				<MadeWithGrabbinBadge hasProAccess={hasProAccess} />
			</div>
			<div className="flex min-h-10 items-center justify-start">
				{isOwner ? (
					<OwnerFooter handle={handle} onHandleChange={onHandleChange} />
				) : (
					<ViewerFooter handle={handle} />
				)}
			</div>
		</footer>
	);
}
