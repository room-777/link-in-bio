import { queryOptions, useQuery } from "@tanstack/react-query";
import { checkPageHandle } from "@/api/page/api";

export const PAGE_HANDLE_CHECK_QUERY_KEY_PREFIX = [
	"page-handle-check",
] as const;

export function getPageHandleCheckQueryOptions(handle: string) {
	return queryOptions({
		queryKey: [...PAGE_HANDLE_CHECK_QUERY_KEY_PREFIX, handle] as const,
		queryFn: ({ signal }) => checkPageHandle(handle, signal),
	});
}

export function usePageHandleCheckQuery(handle: string) {
	return useQuery({
		...getPageHandleCheckQueryOptions(handle),
		enabled: Boolean(handle),
	});
}
