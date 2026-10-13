import { queryOptions, useQuery } from "@tanstack/react-query";
import { getCalendlyConnection } from "@/api/calendly/api";

export const calendlyConnectionQueryKey = ["calendly", "connection"] as const;

export function getCalendlyConnectionQueryOptions() {
	return queryOptions({
		queryKey: calendlyConnectionQueryKey,
		retry: false,
		queryFn: ({ signal }) => getCalendlyConnection(signal),
	});
}

export function useCalendlyConnectionQuery() {
	return useQuery(getCalendlyConnectionQueryOptions());
}
