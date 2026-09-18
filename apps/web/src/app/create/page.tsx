import { redirect } from "next/navigation";

import CreatePageForm from "@/components/page/create-page-form";
import { getPrimaryPagePath, getServerSession } from "@/lib/server/session";

export default async function CreatePage() {
	const session = await getServerSession();
	if (!session) redirect("/sign-in");
	if (session.user.primaryPageHandle) {
		redirect(getPrimaryPagePath(session));
	}

	return <CreatePageForm />;
}
