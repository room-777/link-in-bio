import type { ReactNode } from "react";

export default function LandingHeaderBackground({
	children,
}: {
	children: ReactNode;
}) {
	return (
		<header className="fixed inset-x-0 top-0 z-100003 px-3 py-2 sm:px-10">
			<div className="relative mx-auto flex w-full items-center justify-between rounded-full px-2 py-2 pl-4">
				{children}
			</div>
		</header>
	);
}
