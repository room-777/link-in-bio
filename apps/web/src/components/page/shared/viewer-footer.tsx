"use client";

import { AnimatedTooltip } from "@grabbin/ui/components/animated-tooltip";
import {
	Avatar,
	AvatarFallback,
	AvatarImage,
} from "@grabbin/ui/components/avatar";
import { buttonVariants } from "@grabbin/ui/components/button";
import { Skeleton } from "@grabbin/ui/components/skeleton";
import { useIsMobile } from "@grabbin/ui/components/use-mobile";
import { cn } from "@grabbin/ui/lib/utils";
import Link from "next/link";
import { useEffect, useState } from "react";
import { usePublicViews } from "@/hooks/use-public-views";
import { authClient } from "@/lib/auth-client";
import { getSignInHref } from "@/lib/auth-redirect";
import { openShareLinkDialog } from "../sharing/share-link-dialog";
import {
	getDiscordTooltipControl,
	getShareTooltipControl,
} from "./page-footer-tooltip-controls";
import { getPublicViewsTooltipControl } from "./public-views-tooltip";

export default function ViewerFooter({
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
