import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { makeQueryClient } from "@/lib/query-client";
import { getPrimaryPagePath } from "@/lib/server/session";
import { getCurrentSessionQueryOptions } from "@/query/session/current";
import CreatePageForm from "../../components/page/management/pages/create-page-form";

export const metadata: Metadata = {
	title: "Create your Grabbin page",
	description:
		"Choose a handle and bring your links, photos, social profiles, and favorite places together.",
};

export default async function CreatePage() {
	const session = await makeQueryClient().query(
		getCurrentSessionQueryOptions((await headers()).get("cookie")),
	);
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
