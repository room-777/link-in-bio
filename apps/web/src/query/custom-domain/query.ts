import { queryOptions, useQuery } from "@tanstack/react-query";
import { fetchCustomDomain } from "@/api/custom-domain/api";

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
