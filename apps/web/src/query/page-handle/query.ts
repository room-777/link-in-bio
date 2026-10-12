import { queryOptions, useQuery } from "@tanstack/react-query";
import { checkPageHandle } from "@/api/page/api";

export function getPageHandleCheckQueryOptions(handle: string) {
	return queryOptions({
		queryKey: ["page-handle-check", handle] as const,
		queryFn: ({ signal }) => checkPageHandle(handle, signal),
	});
}

export function usePageHandleCheckQuery(handle: string) {
	return useQuery({
		...getPageHandleCheckQueryOptions(handle),
		enabled: Boolean(handle),
	});
}
