import Loading from "@grabbin/ui/components/loading";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import HandlePage from "@/components/page/handle-page";
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

	return (
		<Suspense
			fallback={
				<main className="mx-auto flex min-h-svh max-w-sm items-center justify-center p-6">
					<Loading />
				</main>
			}
		>
			<HydrationBoundary state={dehydrate(queryClient)}>
				<HandlePage page={page} />
			</HydrationBoundary>
		</Suspense>
	);
}
