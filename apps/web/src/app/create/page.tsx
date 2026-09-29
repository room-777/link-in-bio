import type { Metadata } from "next";
import Image from "next/image";
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
			<div className="pointer-events-none relative mt-16 aspect-[5/1] w-full overflow-hidden">
				<Image
					alt=""
					aria-hidden="true"
					width={2171}
					height={724}
					loading="lazy"
					sizes="100vw"
					src="/images/footer-doodles-bf164e2b806327c8.png"
					className="absolute inset-0 -z-10 h-full w-full select-none object-cover object-bottom"
				/>
			</div>
		</main>
	);
}
