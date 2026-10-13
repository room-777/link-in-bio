import { handleAvailabilityResponseSchema } from "@grabbin/page-handle";
import { queryOptions, useQuery } from "@tanstack/react-query";
import * as v from "valibot";
import { apiClient, getApiErrorMessage } from "@/lib/api-client";

export const PAGE_HANDLE_CHECK_QUERY_KEY_PREFIX = [
	"page-handle-check",
] as const;

async function checkPageHandle(handle: string, signal?: AbortSignal) {
	const response = await apiClient.pages.check.$get(
		{ query: { handle } },
		{ init: { signal } },
	);
	if (!response.ok) throw new Error(await getApiErrorMessage(response));
	return v.parse(handleAvailabilityResponseSchema, await response.json());
}

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
