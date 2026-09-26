import Image from "next/image";
import { redirect } from "next/navigation";

import CreatePageForm from "@/components/page/create-page-form";
import { getPrimaryPagePath, getServerSession } from "@/lib/server/session";

export default async function CreatePage() {
	const session = await getServerSession();
	if (!session) redirect("/sign-in");
	if (session.user.primaryPageHandle) {
		redirect(getPrimaryPagePath(session));
	}

	return (
		<main className="relative min-h-svh">
			<CreatePageForm />
			<div className="pointer-events-none absolute inset-x-0 bottom-0 aspect-[1.25/1] w-full overflow-hidden sm:aspect-[5/1]">
				<Image
					alt=""
					aria-hidden="true"
					fill
					sizes="100vw"
					src="/images/footer-doodles-bf164e2b806327c8.png"
					unoptimized
					className="-z-10 select-none object-cover object-bottom"
				/>
			</div>
		</main>
	);
}
