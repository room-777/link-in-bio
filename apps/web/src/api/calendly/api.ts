import {
	calendlyConnectionStatusSchema,
	calendlyEventsResponseSchema,
	calendlyWidgetResponseSchema,
} from "@grabbin/api";
import { env } from "@grabbin/env/web";
import * as v from "valibot";
import { apiClient } from "@/lib/api-client";

export class CalendlyConnectionError extends Error {
	constructor(
		message: string,
		readonly status?: number,
	) {
		super(message);
	}
}

export async function getCalendlyConnection(signal: AbortSignal) {
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

export async function getCalendlyEvents(signal: AbortSignal) {
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

export async function getCalendlyAvailability(
	handle: string,
	itemId: string,
	startTime: string,
	endTime: string,
	signal: AbortSignal,
) {
	const params = new URLSearchParams({
		start_time: startTime,
		end_time: endTime,
	});
	const response = await fetch(
		`${env.NEXT_PUBLIC_SERVER_URL}/pages/${encodeURIComponent(handle)}/items/${encodeURIComponent(itemId)}/calendly?${params}`,
		{ signal },
	);
	if (!response.ok) throw new Error("Could not load Calendly availability.");
	const result = v.safeParse(
		calendlyWidgetResponseSchema,
		await response.json(),
	);
	if (!result.success) throw new Error("Could not load Calendly availability.");
	return result.output;
}
