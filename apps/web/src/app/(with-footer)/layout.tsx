import type { ReactNode } from "react";
import LandingHeader from "@/components/landing/landing-header";

export default function WithFooterLayout({
	children,
}: {
	children: ReactNode;
}) {
	return (
		<>
			<LandingHeader />
			{children}
		</>
	);
}
