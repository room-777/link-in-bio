import { queryOptions, useQuery } from "@tanstack/react-query";
import { getOwnedPages } from "@/api/page/api";

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
