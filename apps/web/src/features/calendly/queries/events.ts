import { calendlyEventsResponseSchema } from "@grabbin/api";
import { queryOptions, useQuery } from "@tanstack/react-query";
import * as v from "valibot";
import { apiClient } from "@/lib/api-client";

async function getCalendlyEvents(signal: AbortSignal) {
	const response = await apiClient.auth.calendly.events.$get(
		{},
		{ init: { signal } },
	);
	if (!response.ok) throw new Error("Could not load Calendly events.");

	const result = v.safeParse(
		calendlyEventsResponseSchema,
		await response.json(),
	);
	if (!result.success) throw new Error("Could not load Calendly events.");
	return result.output.events;
}

export function getCalendlyEventsQueryOptions() {
	return queryOptions({
		queryKey: ["calendly", "events"] as const,
		queryFn: ({ signal }) => getCalendlyEvents(signal),
	});
}

export function useCalendlyEventsQuery(enabled: boolean) {
	return useQuery({ ...getCalendlyEventsQueryOptions(), enabled });
}
