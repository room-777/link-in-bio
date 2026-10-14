import { calendlyWidgetResponseSchema } from "@grabbin/api";
import { queryOptions, useQuery } from "@tanstack/react-query";
import * as v from "valibot";
import { apiClient } from "@/lib/api-client";

async function getCalendlyAvailability(
	handle: string,
	itemId: string,
	startTime: string,
	endTime: string,
	signal: AbortSignal,
) {
	const request = {
		param: { handle, itemId },
		query: { start_time: startTime, end_time: endTime },
	};
	const response = await apiClient.pages[":handle"].items[
		":itemId"
	].calendly.$get(request, { init: { signal } });
	if (!response.ok) throw new Error("Could not load Calendly availability.");
	const result = v.safeParse(
		calendlyWidgetResponseSchema,
		await response.json(),
	);
	if (!result.success) throw new Error("Could not load Calendly availability.");
	return result.output;
}

export function getCalendlyAvailabilityRange(date: Date) {
	const now = new Date();
	const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
	const requestedMonth = new Date(date.getFullYear(), date.getMonth(), 1);
	const monthStart =
		requestedMonth < currentMonth ? currentMonth : requestedMonth;
	const start =
		monthStart > now ? monthStart : new Date(now.getTime() + 5 * 60_000);
	const monthEnd = new Date(
		monthStart.getFullYear(),
		monthStart.getMonth() + 1,
		1,
	);
	const maxEnd = new Date(start.getTime() + 31 * 24 * 60 * 60 * 1000);
	const end = monthEnd > start && monthEnd < maxEnd ? monthEnd : maxEnd;
	return { startTime: start.toISOString(), endTime: end.toISOString() };
}

function getCalendlyAvailabilityQueryOptions(
	handle: string | undefined,
	itemId: string,
	selectedDate: Date,
) {
	const range = getCalendlyAvailabilityRange(selectedDate);
	return queryOptions({
		queryKey: [
			"calendly",
			"widget",
			handle,
			itemId,
			selectedDate.getFullYear(),
			selectedDate.getMonth(),
		] as const,
		enabled: Boolean(handle),
		retry: 1,
		queryFn: ({ signal }) => {
			if (!handle) throw new Error("Could not load Calendly availability.");
			return getCalendlyAvailability(
				handle,
				itemId,
				range.startTime,
				range.endTime,
				signal,
			);
		},
	});
}

export function useCalendlyAvailabilityQuery(
	handle: string | undefined,
	itemId: string,
	selectedDate: Date,
) {
	return useQuery(
		getCalendlyAvailabilityQueryOptions(handle, itemId, selectedDate),
	);
}
