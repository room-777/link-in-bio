"use client";

import { buttonVariants } from "@grabbin/ui/components/button";
import Link from "next/link";
import { MadeWithGrabbinBadge } from "./made-with-grabbin-badge";
import OwnerFooter from "./owner-footer";
import ViewerFooter from "./viewer-footer";

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
