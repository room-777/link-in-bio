import { publicViewsResponseSchema } from "@grabbin/api";
import { env } from "@grabbin/env/web";
import { queryOptions } from "@tanstack/react-query";
import * as v from "valibot";

const VIEWS_CACHE_TTL_MS = 15 * 60 * 1000;

export function getPublicViewsQueryOptions(handle: string, timezone: string) {
	return queryOptions({
		queryKey: ["public-views", handle, timezone] as const,
		queryFn: async ({ signal }) => {
			const url = new URL(
				`/pages/${encodeURIComponent(handle)}/views`,
				env.NEXT_PUBLIC_SERVER_URL,
			);
			url.searchParams.set("timezone", timezone);
			const response = await fetch(url, {
				credentials: "include",
				headers: { accept: "application/json" },
				signal,
			});
			if (!response.ok) throw new Error("Public views request failed.");
			return v.parse(publicViewsResponseSchema, await response.json());
		},
		staleTime: VIEWS_CACHE_TTL_MS,
	});
}
