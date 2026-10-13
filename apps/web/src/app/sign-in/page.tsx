import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import LoginForm from "@/components/auth/login-form";
import { sanitizeAuthRedirect } from "@/lib/auth-redirect";
import { makeQueryClient } from "@/lib/query-client";
import { getPrimaryPagePath } from "@/lib/server/session";
import { getCurrentSessionQueryOptions } from "@/query/session/current";

export const metadata: Metadata = {
	title: "Sign in to Grabbin",
	description:
		"Sign in to manage your page and bring your links, photos, social profiles, and favorite places together.",
};

export default async function LoginPage({
	searchParams,
}: PageProps<"/sign-in">) {
	const params = await searchParams;
	const rawReturnTo = Array.isArray(params?.returnTo)
		? params.returnTo[0]
		: params?.returnTo;
	const returnTo = sanitizeAuthRedirect(rawReturnTo);
	const session = await makeQueryClient().query(
		getCurrentSessionQueryOptions((await headers()).get("cookie")),
	);
	if (session) redirect(returnTo ?? getPrimaryPagePath(session));

	return (
		<main className="relative grid min-h-svh w-full place-items-center">
			<LoginForm returnTo={returnTo} />
		</main>
	);
}
