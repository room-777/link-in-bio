import { Button } from "@grabbin/ui/components/button";
import { cn } from "@grabbin/ui/lib/utils";
import Link from "next/link";
import type { ComponentProps } from "react";

type JoinForFreeButtonProps = ComponentProps<typeof Button>;

export default function JoinForFreeButton({
	children = "Join for free",
	className,
	render,
	size = "xl",
	variant = "brand",
	...props
}: JoinForFreeButtonProps) {
	const href = "/sign-in";

	return (
		<Button
			{...props}
			variant={variant}
			size={size}
			className={cn("h-14 w-xs text-base", className)}
			nativeButton={false}
			children={children}
			render={render ?? <Link href={href}>{children}</Link>}
		/>
	);
}
