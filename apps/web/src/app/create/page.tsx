import { redirect } from "next/navigation";

import BentoPreview from "@/components/page/bento-preview";
import CreatePageForm from "@/components/page/create-page-form";
import { getPrimaryPagePath, getServerSession } from "@/lib/server/session";

export default async function CreatePage() {
	const session = await getServerSession();
	if (!session) redirect("/sign-in");
	if (session.user.primaryPageHandle) {
		redirect(getPrimaryPagePath(session));
	}

	return (
		<div className="grid min-h-svh w-full grid-cols-1 lg:grid-cols-2">
			<CreatePageForm />
			<BentoPreview />
		</div>
	);
}
