import { queryOptions, useQuery } from "@tanstack/react-query";
import { apiClient, getApiErrorMessage } from "@/lib/api-client";

async function getOwnedPages() {
	const response = await apiClient.pages.owned.$get();
	if (!response.ok) throw new Error(await getApiErrorMessage(response));
	const result = await response.json();
	if (!("pages" in result)) throw new Error("Could not load your pages.");
	return result;
}

export const OWNED_PAGES_QUERY_KEY = ["owned-pages"] as const;

export function getOwnedPagesQueryOptions() {
	return queryOptions({
		queryKey: OWNED_PAGES_QUERY_KEY,
		queryFn: getOwnedPages,
	});
}

export function useOwnedPagesQuery(enabled: boolean) {
	return useQuery({ ...getOwnedPagesQueryOptions(), enabled });
}
