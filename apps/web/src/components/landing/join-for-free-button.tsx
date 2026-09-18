import { Button } from "@grabbin/ui/components/button";
import { cn } from "@grabbin/ui/lib/utils";
import Link from "next/link";
import type { ComponentProps } from "react";

import { getPrimaryPagePath, getServerSession } from "@/lib/server/session";

type JoinForFreeButtonProps = ComponentProps<typeof Button>;

export default async function JoinForFreeButton({
	children = "Join for free",
	className,
	render,
	size = "xl",
	variant = "brand",
	...props
}: JoinForFreeButtonProps) {
	const session = await getServerSession();
	const href = session ? getPrimaryPagePath(session) : "/sign-in";

	return (
		<Button
			{...props}
			variant={variant}
			size={size}
			className={cn("h-14 w-xs text-base", className)}
			children={children}
			render={render ?? <Link href={href}>{children}</Link>}
		/>
	);
}
