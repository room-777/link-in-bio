import { pageDomainResponseSchema } from "@grabbin/api";
import { queryOptions, useQuery } from "@tanstack/react-query";
import * as v from "valibot";
import { apiClient, getApiErrorMessage } from "@/lib/api-client";

async function fetchCustomDomain(handle: string) {
	const response = await apiClient.pages[":handle"].domain.$get({
		param: { handle },
	});
	if (!response.ok) throw new Error(await getApiErrorMessage(response));
	return v.parse(pageDomainResponseSchema, await response.json());
}

export function getCustomDomainQueryOptions(handle: string | undefined) {
	return queryOptions({
		queryKey: ["page-domain", handle] as const,
		queryFn: () => {
			if (!handle) throw new Error("Could not find this page.");
			return fetchCustomDomain(handle);
		},
		refetchInterval: (query) =>
			query.state.data?.domain &&
			["waiting_dns", "provisioning", "deleting"].includes(
				query.state.data.domain.status,
			)
				? 60_000
				: false,
	});
}

export function useCustomDomainQuery(
	handle: string | undefined,
	active: boolean,
) {
	return useQuery({
		...getCustomDomainQueryOptions(handle),
		enabled: active && Boolean(handle),
	});
}
