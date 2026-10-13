import { pageByHandleResponseSchema } from "@grabbin/api";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import * as v from "valibot";
import { apiClient, getApiErrorMessage } from "@/lib/api-client";
import { getServerApiClient } from "@/lib/server/api-client";

export async function fetchPage(
	handle: string,
	headers?: Record<string, string>,
) {
	const serverClient = getServerApiClient();
	const fetchWith = async (client: typeof apiClient) => {
		const response = await client.pages[":handle"].$get(
			{ param: { handle } },
			headers ? { headers } : undefined,
		);

		if (!response.ok) {
			if (response.status === 404) return null;
			throw new Error(await getApiErrorMessage(response));
		}

		const body: unknown = await response.json();
		if (body === null || typeof body !== "object" || Array.isArray(body)) {
			const path = response.url
				? new URL(response.url, "http://localhost").pathname
				: "unknown path";
			const bodyType =
				body === null ? "null" : Array.isArray(body) ? "array" : typeof body;
			console.error("Page API returned a non-object response.", {
				status: response.status,
				url: response.url,
				contentType: response.headers.get("content-type"),
				bodyType,
			});
			throw new Error(
				`Page API returned ${bodyType} instead of an object (HTTP ${response.status}, ${path}).`,
			);
		}
		return "page" in body ? v.parse(pageByHandleResponseSchema, body) : null;
	};

	if (!serverClient) return fetchWith(apiClient);
	try {
		return await fetchWith(serverClient);
	} catch (error) {
		console.warn(
			"Page service binding failed; retrying through the API URL.",
			error,
		);
		return fetchWith(apiClient);
	}
}

export function getPageByHandleQueryOptions(handle: string) {
	return queryOptions({
		queryKey: ["page-by-handle", handle] as const,
		queryFn: () => fetchPage(handle),
	});
}

export function useSuspensePageByHandleQuery(handle: string) {
	const { data } = useSuspenseQuery(getPageByHandleQueryOptions(handle));
	if (!data) throw new Error("Page data is unavailable.");
	return data;
}
