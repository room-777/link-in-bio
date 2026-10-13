import { pageItemRssResponseSchema } from "@grabbin/api";
import { providerIconUrl } from "@grabbin/page-link";
import { useMutation } from "@tanstack/react-query";
import * as v from "valibot";
import { apiClient, getApiErrorMessage } from "@/lib/api-client";

export async function fetchBentoRss(handle: string, url: string) {
	const response = await apiClient.pages[":handle"].metadata.$post(
		{ param: { handle } },
		{
			init: {
				body: JSON.stringify({ kind: "rss", url }),
				headers: { "Content-Type": "application/json" },
			},
		},
	);
	if (!response.ok) throw new Error(await getApiErrorMessage(response));
	const result = v.parse(pageItemRssResponseSchema, await response.json());
	return {
		...result,
		rss: {
			...result.rss,
			source: {
				...result.rss.source,
				iconUrl: providerIconUrl(
					result.rss.source.platform,
					result.rss.source.platform === "ghost" ? "webp" : "svg",
				),
			},
		},
	};
}

export function useFetchBentoRssMutation() {
	return useMutation({
		mutationFn: ({ handle, url }: { handle: string; url: string }) =>
			fetchBentoRss(handle, url).then(({ rss }) => rss),
	});
}
