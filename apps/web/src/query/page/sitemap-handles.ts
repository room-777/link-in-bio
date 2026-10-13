import { queryOptions } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { getServerApiClient } from "@/lib/server/api-client";

export function getSitemapHandlesQueryOptions() {
	return queryOptions({
		queryKey: ["sitemap-handles"] as const,
		queryFn: async () => {
			try {
				const client = getServerApiClient() ?? apiClient;
				const response = await client.pages.sitemap.$get();
				if (!response.ok) return [];
				return (await response.json()).handles;
			} catch {
				return [];
			}
		},
	});
}
