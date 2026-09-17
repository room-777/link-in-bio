import Loading from "@grabbin/ui/components/loading";
import { headers } from "next/headers";
import { Suspense } from "react";

import HandlePage from "@/components/page/handle-page";
import { pageQueryOptions } from "@/lib/page-query";
import { getQueryClient } from "@/lib/query-client";

export default async function Page({
	params,
}: {
	params: Promise<{ handle: string }>;
}) {
	const { handle } = await params;
	const queryClient = getQueryClient();
	const requestHeaders = await headers();

	void queryClient
		.query(
			pageQueryOptions(handle, {
				cookie: requestHeaders.get("cookie") ?? "",
			}),
		)
		.catch(() => undefined);

	return (
		<Suspense
			fallback={
				<main className="mx-auto flex min-h-svh max-w-sm items-center justify-center p-6">
					<Loading />
				</main>
			}
		>
			<HandlePage handle={handle} />
		</Suspense>
	);
}
