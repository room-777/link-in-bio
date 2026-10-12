"use client";

import { AnimatedTooltip } from "@grabbin/ui/components/animated-tooltip";
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
import { Separator } from "@grabbin/ui/components/separator";
import { Skeleton } from "@grabbin/ui/components/skeleton";
import { toast } from "@grabbin/ui/components/toast";
import { useIsMobile } from "@grabbin/ui/components/use-mobile";
import { cn } from "@grabbin/ui/lib/utils";
import { SlidersHorizontal } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { usePublicViews } from "@/hooks/use-public-views";
import { authClient, getAuthErrorMessage } from "@/lib/auth-client";
import { getSignInHref } from "@/lib/auth-redirect";
import { openChangeHandleDialog } from "../management/change-handle-dialog";
import { openDeleteAccountDialog } from "../management/delete-account-dialog";
import { openSettingDialog } from "../management/setting-dialog";
import { openShareLinkDialog } from "../sharing/share-link-dialog";
import { MadeWithGrabbinBadge } from "./made-with-grabbin-badge";
import {
	getDiscordTooltipControl,
	getShareTooltipControl,
} from "./page-footer-tooltip-controls";
import { getPublicViewsTooltipControl } from "./public-views-tooltip";

function OwnerFooter({
	handle,
	onHandleChange,
	profileImageUrl,
	isAutoSaving,
}: {
	handle?: string;
	onHandleChange?: (handle: string) => void;
	profileImageUrl: string | null;
	isAutoSaving: boolean;
}) {
	const router = useRouter();
	const isMobile = useIsMobile();
	const [isOpen, setIsOpen] = useState(false);
	const [isSigningOut, setIsSigningOut] = useState(false);
	const viewsTooltip = getPublicViewsTooltipControl(usePublicViews(handle));

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
					<AnimatedTooltip
						className="bg-background text-muted-foreground"
						controls={[
							{
								id: "setting",
								content: "Setting",
								trigger: (
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
								),
							},
							getDiscordTooltipControl(),
							viewsTooltip,
							getShareTooltipControl(
								() => openShareLinkDialog(profileImageUrl, isMobile),
								isAutoSaving,
							),
						].filter((control) => control !== null)}
					/>
					<PopoverContent
						align="start"
						side="top"
						sideOffset={8}
						initialFocus={false}
						className="smooth-shadow-ring-md w-60 items-center gap-1 rounded-3xl p-2"
					>
						<PopoverTitle className="sr-only">Page options</PopoverTitle>
						<Button
							variant="ghost"
							className="h-16 w-full justify-start px-3"
							onClick={() => {
								setIsOpen(false);
								openChangeHandleDialog(handle, onHandleChange);
							}}
						>
							<span className="flex flex-col items-start gap-0.5 text-left">
								<span>Change handle</span>
								<span className="w-full min-w-0 break-all text-muted-foreground/80 text-sm">
									{handle ? `/${handle}` : null}
								</span>
							</span>
						</Button>
						<Separator
							orientation="horizontal"
							className="rounded-full bg-secondary data-horizontal:mx-3 data-horizontal:h-[1.5px] data-horizontal:w-[calc(100%-1.5rem)]!"
						/>
						<Button
							variant="ghost"
							className="h-12 w-full justify-start px-3"
							onClick={() => {
								setIsOpen(false);
								openSettingDialog(handle);
							}}
						>
							Setting
						</Button>
						<Button
							variant="ghost"
							className="h-12 w-full justify-start px-3"
							disabled={isSigningOut}
							onClick={handleSignOut}
						>
							{isSigningOut ? "Logging out..." : "Log Out"}
						</Button>
						<Button
							variant="ghost"
							className="h-12 w-full justify-start px-3 text-primary"
							onClick={() => {
								setIsOpen(false);
								openDeleteAccountDialog();
							}}
						>
							Delete account
						</Button>
					</PopoverContent>
				</Popover>
			</div>
		</>
	);
}

function ViewerFooter({
	handle,
	profileImageUrl,
}: {
	handle?: string;
	profileImageUrl: string | null;
}) {
	const { data: session, isPending } = authClient.useSession();
	const isMobile = useIsMobile();
	const [isHydrated, setIsHydrated] = useState(false);
	const viewsTooltip = getPublicViewsTooltipControl(usePublicViews(handle));

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
					Create your page
				</Link>
				<AnimatedTooltip
					className="bg-background"
					controls={[
						getDiscordTooltipControl(),
						viewsTooltip,
						getShareTooltipControl(() =>
							openShareLinkDialog(profileImageUrl, isMobile),
						),
					].filter((control) => control !== null)}
				/>
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
			<AnimatedTooltip
				className="bg-background"
				controls={[
					getDiscordTooltipControl(),
					viewsTooltip,
					getShareTooltipControl(() =>
						openShareLinkDialog(profileImageUrl, isMobile),
					),
				].filter((control) => control !== null)}
			/>
		</div>
	);
}

export default function PageFooter({
	handle,
	isOwner,
	profileImageUrl,
	demoMode = false,
	onHandleChange,
	hasProAccess,
	isAutoSaving = false,
}: {
	handle?: string;
	isOwner: boolean;
	profileImageUrl: string | null;
	demoMode?: boolean;
	onHandleChange?: (handle: string) => void;
	hasProAccess?: boolean;
	isAutoSaving?: boolean;
}) {
	return (
		<footer className="page-wide:fixed page-wide:bottom-6 page-wide:left-16 page-wide:z-30 -mx-4 page-wide:-mx-2 mb-20 page-wide:mb-4 flex min-h-10 page-wide:w-auto w-full flex-col page-wide:items-start items-center justify-start gap-2 page-wide:py-0 py-12">
			{!demoMode ? (
				<div className="page-wide:block hidden">
					<MadeWithGrabbinBadge hasProAccess={hasProAccess} />
				</div>
			) : null}
			<div className="flex min-h-10 items-center justify-start">
				{demoMode ? (
					<Link
						href="/create"
						className={buttonVariants({
							variant: "ghost",
							size: "lg",
							className: "text-muted-foreground",
						})}
					>
						Create your page
					</Link>
				) : isOwner ? (
					<OwnerFooter
						handle={handle}
						onHandleChange={onHandleChange}
						profileImageUrl={profileImageUrl}
						isAutoSaving={isAutoSaving}
					/>
				) : (
					<ViewerFooter handle={handle} profileImageUrl={profileImageUrl} />
				)}
			</div>
		</footer>
	);
}
