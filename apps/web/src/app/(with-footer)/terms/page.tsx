import type { Metadata } from "next";
import LegalPage from "@/components/legal/legal-page";
import Terms from "@/content/legal/terms.mdx";

export const revalidate = false;

export const metadata: Metadata = {
	title: "Terms of Service",
	description: "The terms that apply when you use Grabbin.",
};

export default function TermsPage() {
	return (
		<LegalPage
			Document={Terms}
			title="Terms of Service"
			description="The terms that apply when you use Grabbin."
			lastUpdated="August 19, 2026"
		/>
	);
}
