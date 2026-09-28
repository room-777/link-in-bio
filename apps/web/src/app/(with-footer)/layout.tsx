import type { ReactNode } from "react";
import LandingHeader from "@/components/landing/landing-header";
import Footer from "@/components/layout/footer";

export default function WithFooterLayout({
	children,
}: {
	children: ReactNode;
}) {
	return (
		<>
			<LandingHeader />
			{children}
			<Footer />
		</>
	);
}
