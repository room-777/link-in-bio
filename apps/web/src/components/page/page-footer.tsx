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
import { cn } from "@grabbin/ui/lib/utils";
import { SlidersHorizontal } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { authClient, getAuthErrorMessage } from "@/lib/auth-client";
import { getSignInHref } from "@/lib/auth-redirect";

function OwnerFooter() {
	const router = useRouter();
	const [isSigningOut, setIsSigningOut] = useState(false);

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
		<Popover>
			<PopoverTrigger
				render={
					<Button
						variant="ghost"
						size="icon"
						className={"text-muted-foreground/80"}
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
				className="w-48 p-1"
			>
				<PopoverTitle hidden className="px-2 py-1">
					Page options
				</PopoverTitle>
				<Button
					variant="ghost"
					className="w-full justify-start"
					disabled={isSigningOut}
					onClick={handleSignOut}
				>
					{isSigningOut ? "Logging out..." : "Log out"}
				</Button>
			</PopoverContent>
		</Popover>
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
}: {
	handle?: string;
	isOwner: boolean;
}) {
	return (
		<footer className="-mx-4 mb-4 flex min-h-10 items-center justify-start pt-8 min-[90rem]:-mx-2">
			{isOwner ? <OwnerFooter /> : <ViewerFooter handle={handle} />}
		</footer>
	);
}
