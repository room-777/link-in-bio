import type { Metadata } from "next";
import LegalPage from "@/components/legal/legal-page";
import Terms from "@/content/legal/terms.mdx";

export const revalidate = false;

const description =
	"Read the rules for creating and sharing pages on Grabbin, including account responsibilities, acceptable use, and service terms.";

export const metadata: Metadata = {
	title: "Terms of Service",
	description,
};

export default function TermsPage() {
	return (
		<LegalPage
			Document={Terms}
			title="Terms of Service"
			description={description}
			lastUpdated="August 19, 2026"
		/>
	);
}
