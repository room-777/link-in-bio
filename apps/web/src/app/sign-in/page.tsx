import { redirect } from "next/navigation";

import LoginForm from "@/components/auth/login-form";
import { getPrimaryPagePath, getServerSession } from "@/lib/server/session";

export default async function LoginPage() {
	const session = await getServerSession();
	if (session) redirect(getPrimaryPagePath(session));

	return <LoginForm />;
}
