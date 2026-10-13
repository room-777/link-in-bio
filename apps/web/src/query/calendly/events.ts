import { queryOptions, useQuery } from "@tanstack/react-query";
import { getCalendlyEvents } from "@/api/calendly/api";

export function getCalendlyEventsQueryOptions() {
	return queryOptions({
		queryKey: ["calendly", "events"] as const,
		queryFn: ({ signal }) => getCalendlyEvents(signal),
	});
}

export function useCalendlyEventsQuery(enabled: boolean) {
	return useQuery({ ...getCalendlyEventsQueryOptions(), enabled });
}
