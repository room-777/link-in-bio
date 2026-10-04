import { headers } from "next/headers";
import type { ReactNode } from "react";
import LandingHeader from "@/components/landing/landing-header";
import Footer from "@/components/layout/footer";
import { getCustomDomainHostname } from "@/lib/custom-domain-host";

export default async function WithFooterLayout({
	children,
}: {
	children: ReactNode;
}) {
	const requestHeaders = await headers();
	if (getCustomDomainHostname(requestHeaders.get("host"))) return children;

	return (
		<>
			<LandingHeader />
			{children}
			<Footer />
		</>
	);
}
