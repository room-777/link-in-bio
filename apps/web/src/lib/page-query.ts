import { pageByHandleResponseSchema } from "@grabbin/api";
import { queryOptions } from "@tanstack/react-query";
import * as v from "valibot";
import { apiClient, getApiErrorMessage } from "./api-client";

export function getPageQueryOptions(handle: string) {
	return queryOptions({
		queryKey: ["page-by-handle", handle] as const,
		queryFn: async ({ signal }) => {
			const response = await apiClient.pages[":handle"].$get(
				{ param: { handle } },
				{ init: { signal } },
			);

			if (!response.ok) {
				if (response.status === 404) return null;
				throw new Error(await getApiErrorMessage(response));
			}

			const body: unknown = await response.json();
			if (body === null || typeof body !== "object" || Array.isArray(body)) {
				const path = response.url
					? new URL(response.url).pathname
					: "unknown path";
				const bodyType =
					body === null ? "null" : Array.isArray(body) ? "array" : typeof body;
				throw new Error(
					`Page API returned ${bodyType} instead of an object (HTTP ${response.status}, ${path}).`,
				);
			}
			return "page" in body ? v.parse(pageByHandleResponseSchema, body) : null;
		},
	});
}
