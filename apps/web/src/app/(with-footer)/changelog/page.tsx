import type { Metadata } from "next";
import UpdatesList, {
	updatesDescription,
} from "@/components/updates/updates-list";

export const metadata: Metadata = {
	title: "Updates | Grabbin",
	description: updatesDescription,
	alternates: { canonical: "/changelog" },
	openGraph: {
		title: "Updates | Grabbin",
		description: updatesDescription,
		url: "/changelog",
		siteName: "Grabbin",
		type: "website",
	},
	twitter: {
		card: "summary",
		title: "Updates | Grabbin",
		description: updatesDescription,
	},
};

export const revalidate = false;

export default function ChangelogPage() {
	return <UpdatesList />;
}
