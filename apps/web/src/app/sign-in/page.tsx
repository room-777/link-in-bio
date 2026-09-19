import { redirect } from "next/navigation";

import LoginForm from "@/components/auth/login-form";
import { sanitizeAuthRedirect } from "@/lib/auth-redirect";
import { getPrimaryPagePath, getServerSession } from "@/lib/server/session";

export default async function LoginPage({
	searchParams,
}: PageProps<"/sign-in">) {
	const params = await searchParams;
	const rawReturnTo = Array.isArray(params?.returnTo)
		? params.returnTo[0]
		: params?.returnTo;
	const returnTo = sanitizeAuthRedirect(rawReturnTo);
	const session = await getServerSession();
	if (session) redirect(returnTo ?? getPrimaryPagePath(session));

	return <LoginForm returnTo={returnTo} />;
}
