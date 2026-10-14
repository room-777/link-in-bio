import { calendlyConnectionStatusSchema } from "@grabbin/api";
import { queryOptions, useQuery } from "@tanstack/react-query";
import * as v from "valibot";
import { apiClient } from "@/lib/api-client";

export const calendlyConnectionQueryKey = ["calendly", "connection"] as const;

export class CalendlyConnectionError extends Error {
	constructor(
		message: string,
		readonly status?: number,
	) {
		super(message);
	}
}

async function getCalendlyConnection(signal: AbortSignal) {
	const response = await apiClient.auth.calendly.$get({}, { init: { signal } });
	if (response.status === 401) {
		throw new CalendlyConnectionError(
			"Sign in to connect your Calendly account.",
			401,
		);
	}
	if (!response.ok)
		throw new CalendlyConnectionError(
			"Could not check your Calendly connection.",
		);

	const result = v.safeParse(
		calendlyConnectionStatusSchema,
		await response.json(),
	);
	if (!result.success)
		throw new CalendlyConnectionError(
			"Could not check your Calendly connection.",
		);
	return result.output;
}

function getCalendlyConnectionQueryOptions() {
	return queryOptions({
		queryKey: calendlyConnectionQueryKey,
		retry: false,
		queryFn: ({ signal }) => getCalendlyConnection(signal),
	});
}

export function useCalendlyConnectionQuery() {
	return useQuery(getCalendlyConnectionQueryOptions());
}
