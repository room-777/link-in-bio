import {
	type PublicViewsResponse,
	publicViewsResponseSchema,
} from "@grabbin/api";
import { env } from "@grabbin/env/web";
import { queryOptions } from "@tanstack/react-query";
import * as v from "valibot";

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
		select: selectPublicViews,
		staleTime: VIEWS_CACHE_TTL_MS,
	});
}
