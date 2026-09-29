import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";

import LoginForm from "@/components/auth/login-form";
import { sanitizeAuthRedirect } from "@/lib/auth-redirect";
import { getPrimaryPagePath, getServerSession } from "@/lib/server/session";

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
	const session = await getServerSession();
	if (session) redirect(returnTo ?? getPrimaryPagePath(session));

	return (
		<main className="relative grid min-h-svh w-full place-items-center">
			<LoginForm returnTo={returnTo} />
			<div className="pointer-events-none absolute inset-x-0 bottom-0 aspect-[1.25/1] w-full overflow-hidden sm:aspect-[5/1]">
				<Image
					alt=""
					aria-hidden="true"
					fill
					loading="lazy"
					sizes="100vw"
					quality={55}
					src="/images/footer-doodles-bf164e2b806327c8.png"
					className="-z-10 select-none object-cover object-bottom"
				/>
			</div>
		</main>
	);
}
