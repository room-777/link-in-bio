import type { Metadata } from "next";
import LegalPage from "@/components/legal/legal-page";
import Privacy from "@/content/legal/privacy.mdx";

export const revalidate = false;

const description =
	"Learn what personal data Grabbin collects, how it is used and stored, and the choices available to you when you use the service.";

export const metadata: Metadata = {
	title: "Privacy Policy",
	description,
};

export default function PrivacyPage() {
	return (
		<LegalPage
			Document={Privacy}
			title="Privacy Policy"
			description={description}
			lastUpdated="August 19, 2026"
		/>
	);
}
