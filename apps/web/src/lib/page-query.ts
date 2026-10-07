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

			const body = await response.json();
			return "page" in body ? v.parse(pageByHandleResponseSchema, body) : null;
		},
	});
}
