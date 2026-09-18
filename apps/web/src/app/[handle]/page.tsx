import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { headers } from "next/headers";
import { notFound } from "next/navigation";

import HandlePage from "@/components/page/handle-page";
import PageOnboardingForm from "@/components/page/page-onboarding-form";
import { pageQueryOptions } from "@/lib/page-query";
import { getQueryClient } from "@/lib/query-client";

export default async function Page({ params }: PageProps<"/[handle]">) {
	const { handle } = await params;
	const queryClient = getQueryClient();
	const requestHeaders = await headers();

	const page = await queryClient.query(
		pageQueryOptions(handle, {
			cookie: requestHeaders.get("cookie") ?? "",
		}),
	);

	if (!page) notFound();

	if (!page.onboarding && page.isOwner) {
		return (
			<main className="mx-auto flex min-h-svh w-full max-w-md flex-col justify-start gap-8 p-6 px-12 pt-12 min-[90rem]:mx-0 min-[90rem]:min-h-dvh min-[90rem]:max-w-2xl min-[90rem]:pt-16">
				<PageOnboardingForm page={page} />
			</main>
		);
	}

	return (
		<HydrationBoundary state={dehydrate(queryClient)}>
			<HandlePage page={page} />
		</HydrationBoundary>
	);
}
