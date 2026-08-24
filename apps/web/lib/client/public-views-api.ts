import { queryOptions } from "@tanstack/react-query";
import * as v from "valibot";

const VIEWS_CACHE_TTL_MS = 15 * 60 * 1000;

const publicViewsResponseSchema = v.object({
  todayViews: v.nullable(v.number()),
  yesterdayViews: v.nullable(v.number()),
});

export type PublicViewsResponse = v.InferOutput<
  typeof publicViewsResponseSchema
>;

async function getPublicViews(
  pageId: string,
  timezone: string,
): Promise<PublicViewsResponse> {
  const params = new URLSearchParams({ pageId, timezone });
  const response = await fetch(`/api/public-views?${params}`, {
    cache: "no-store",
    credentials: "include",
    headers: { accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(
      `Public views request failed with status ${response.status}.`,
    );
  }

  return v.parse(publicViewsResponseSchema, await response.json());
}

export function getPublicViewsQueryOptions(pageId: string, timezone: string) {
  return queryOptions({
    queryKey: ["public-views", pageId, timezone] as const,
    queryFn: () => getPublicViews(pageId, timezone),
    staleTime: VIEWS_CACHE_TTL_MS,
  });
}
