import type { PublicViewsResponse } from "@grabbin/api";
import { queryOptions, useQuery } from "@tanstack/react-query";
import { getPublicViews } from "@/api/public-views/api";

const VIEWS_CACHE_TTL_MS = 15 * 60 * 1000;

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

export function getPublicViewsQueryOptions(handle: string, timezone: string) {
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
