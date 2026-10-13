import { queryOptions } from "@tanstack/react-query";
import { apiClient, getApiErrorMessage } from "@/lib/api-client";
import { getServerApiClient } from "@/lib/server/api-client";
import { fetchPage } from "./by-handle";

export function getPageByCustomDomainQueryOptions(hostname: string) {
	return queryOptions({
		queryKey: ["page-by-custom-domain", hostname] as const,
		queryFn: async () => {
			const client = getServerApiClient() ?? apiClient;
			const response = await client.pages.domain[":hostname"].$get({
				param: { hostname },
			});

			if (response.status === 404 || response.status === 422) return null;
			if (!response.ok) throw new Error(await getApiErrorMessage(response));

			const result = await response.json();
			if (!("handle" in result)) {
				throw new Error("Could not find this page.");
			}
			return fetchPage(result.handle);
		},
	});
}
