import { pageByHandleResponseSchema } from "@grabbin/api";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import * as v from "valibot";
import { apiClient, getApiErrorMessage } from "@/lib/api-client";
import { getServerApiClient } from "@/lib/server/api-client";

export async function getPageByHandle(
	handle: string,
	headers?: Record<string, string>,
) {
	const client = getServerApiClient() ?? apiClient;
	const response = await client.pages[":handle"].$get(
		{ param: { handle } },
		headers ? { headers } : undefined,
	);

	if (!response.ok) {
		if (response.status === 404) return null;
		throw new Error(await getApiErrorMessage(response));
	}

	return v.parse(pageByHandleResponseSchema, await response.json());
}

export function getPageByHandleQueryOptions(handle: string) {
	return queryOptions({
		queryKey: ["page-by-handle", handle] as const,
		queryFn: () => getPageByHandle(handle),
	});
}

export function useSuspensePageByHandleQuery(handle: string) {
	const { data } = useSuspenseQuery(getPageByHandleQueryOptions(handle));
	if (!data) throw new Error("Page data is unavailable.");
	return data;
}
