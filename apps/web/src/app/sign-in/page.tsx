import { redirect } from "next/navigation";

import LoginForm from "@/components/auth/login-form";
import BentoPreview from "@/components/page/bento-preview";
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

	return (
		<main className="grid min-h-svh w-full grid-cols-1 xl:grid-cols-[minmax(0,1fr)_796px]">
			<LoginForm returnTo={returnTo} />
			<BentoPreview />
		</main>
	);
}
