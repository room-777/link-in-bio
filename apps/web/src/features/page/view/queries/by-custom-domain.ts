import { queryOptions } from "@tanstack/react-query";
import { apiClient, getApiErrorMessage } from "@/lib/api-client";
import { getServerApiClient } from "@/lib/server/api-client";
import { getPageByHandle } from "./by-handle";

async function getPageByCustomDomain(hostname: string) {
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
	return getPageByHandle(result.handle);
}

export function getPageByCustomDomainQueryOptions(hostname: string) {
	return queryOptions({
		queryKey: ["page-by-custom-domain", hostname] as const,
		queryFn: () => getPageByCustomDomain(hostname),
	});
}
