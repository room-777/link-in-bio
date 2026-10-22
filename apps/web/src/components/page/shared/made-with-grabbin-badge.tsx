"use client";

import { useSession } from "@/lib/auth-client";

export default function MadeWithGrabbinBadge({
	hasProAccess,
}: {
	hasProAccess?: boolean;
}) {
	const { data: session, isPending } = useSession();
	if (hasProAccess ?? (isPending || session?.plan.hasAccess)) return null;

	return (
		<span className="cursor-pointer rounded-sm bg-brand-black px-3 py-1.5 font-medium text-primary-foreground text-sm outline-depth">
			<span className="shimmer shimmer-color-blue-500/60 shimmer-duration-5500">
				made with grabbin
			</span>
		</span>
	);
}

export { MadeWithGrabbinBadge };
