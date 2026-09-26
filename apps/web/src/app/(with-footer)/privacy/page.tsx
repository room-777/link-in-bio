import type { Metadata } from "next";
import LegalPage from "@/components/legal/legal-page";
import Privacy from "@/content/legal/privacy.mdx";

export const metadata: Metadata = {
	title: "Privacy Policy",
	description: "How Grabbin collects, uses, and protects your information.",
};

export default function PrivacyPage() {
	return (
		<LegalPage
			Document={Privacy}
			title="Privacy Policy"
			description="How Grabbin collects, uses, and protects your information."
			lastUpdated="August 19, 2026"
		/>
	);
}
