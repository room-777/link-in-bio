import type { PublicViewsResponse } from "@grabbin/api";
import { publicViewsResponseSchema } from "@grabbin/api";
import { queryOptions, useQuery } from "@tanstack/react-query";
import * as v from "valibot";
import { apiClient, getApiErrorMessage } from "@/lib/api-client";

const VIEWS_CACHE_TTL_MS = 15 * 60 * 1000;

async function getPublicViews(
	handle: string,
	timezone: string,
	signal: AbortSignal,
) {
	const request = { param: { handle }, query: { timezone } };
	const response = await apiClient.pages[":handle"].views.$get(request, {
		init: { signal },
	});
	if (!response.ok) throw new Error(await getApiErrorMessage(response));
	return v.parse(publicViewsResponseSchema, await response.json());
}

function formatViews(views: number) {
	if (views >= 1_000_000)
		return { count: views, value: Math.floor(views / 1_000_000), unit: "M" };
	if (views >= 1_000)
		return { count: views, value: Math.floor(views / 1_000), unit: "K" };
	return { count: views, value: views, unit: "" };
}

function selectPublicViews({
	todayViews,
	yesterdayViews,
}: PublicViewsResponse) {
	return {
		today: todayViews === null ? null : formatViews(todayViews),
		yesterday: yesterdayViews === null ? null : formatViews(yesterdayViews),
	};
}

function getPublicViewsQueryOptions(handle: string, timezone: string) {
	return queryOptions({
		queryKey: ["public-views", handle, timezone] as const,
		queryFn: ({ signal }) => getPublicViews(handle, timezone, signal),
		select: selectPublicViews,
		staleTime: VIEWS_CACHE_TTL_MS,
	});
}

export function usePublicViewsQuery(handle?: string, timezone?: string | null) {
	return useQuery({
		...getPublicViewsQueryOptions(handle ?? "", timezone ?? "UTC"),
		enabled: Boolean(handle && timezone),
	});
}
