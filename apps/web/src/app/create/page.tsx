import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getPrimaryPagePath, getServerSession } from "@/lib/server/session";
import CreatePageForm from "../../components/page/management/create-page-form";

export const metadata: Metadata = {
	title: "Create your Grabbin page",
	description:
		"Choose a handle and bring your links, photos, social profiles, and favorite places together.",
};

export default async function CreatePage() {
	const session = await getServerSession();
	if (!session) redirect("/sign-in");
	if (session.user.primaryPageHandle) {
		redirect(getPrimaryPagePath(session));
	}

	return (
		<main className="relative min-h-svh">
			<CreatePageForm />
		</main>
	);
}
