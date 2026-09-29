import { createLucideIcon } from "lucide-react";
import Link from "next/link";

const LogoIcon = createLucideIcon("PlayingCardsFan", [
	[
		"path",
		{
			d: "M12.65 7.65a2 2 0 012.629-1.046l5.51 2.374a2 2 0 011.046 2.628l-3.957 9.184a2 2 0 01-2.628 1.046l-5.51-2.374a2 2 0 01-1.046-2.628z",
		},
	],
	[
		"path",
		{
			d: "M18 7.777V4a2 2 0 00-2-2h-6a2 2 0 00-2 2v10a2 2 0 001.137 1.805",
		},
	],
	[
		"path",
		{
			d: "M8 4 3.636 5.198a2 2 0 00-1.602 2.33l1.822 9.833a2 2 0 002.331 1.602l2.542-.47",
		},
	],
	[
		"path",
		{
			d: "M12.65 7.65a2 2 0 012.629-1.046l5.51 2.374a2 2 0 011.046 2.628l-3.957 9.184a2 2 0 01-2.628 1.046l-5.51-2.374a2 2 0 01-1.046-2.628z M18 7.777V4a2 2 0 00-2-2h-6a2 2 0 00-2 2v10a2 2 0 001.137 1.805 M8 4 3.636 5.198a2 2 0 00-1.602 2.33l1.822 9.833a2 2 0 002.331 1.602l2.542-.47",
			fill: "none",
		},
	],
]);

export default function Logo({
	className,
	decorative = false,
}: {
	className?: string;
	decorative?: boolean;
}) {
	return (
		<Link
			href="/"
			prefetch={false}
			aria-label={decorative ? "Home" : undefined}
		>
			<LogoIcon
				className={`stroke-1 ${className ?? ""}`}
				fill="white"
				role={decorative ? undefined : "img"}
				aria-label={decorative ? undefined : "Grabbin"}
				aria-hidden={decorative || undefined}
			/>
		</Link>
	);
}
