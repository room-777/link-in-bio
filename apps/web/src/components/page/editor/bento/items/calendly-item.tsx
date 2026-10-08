"use client";

import {
	calendlyWidgetResponseSchema,
	type PageItemResponse,
} from "@grabbin/api";
import type { PresetName } from "@grabbin/bento-layout";
import { env } from "@grabbin/env/web";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import * as v from "valibot";
import { calendlyPresetComponents } from "./calendly-widget";

const apiUrl = env.NEXT_PUBLIC_SERVER_URL;

function getAvailabilityRange(date: Date) {
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

export function CalendlyItem({
	item,
	preset,
	handle,
}: {
	item: Extract<PageItemResponse, { type: "calendly" }>;
	preset: PresetName;
	handle?: string;
}) {
	const [selectedDate, setSelectedDate] = useState(() => new Date());
	const range = getAvailabilityRange(selectedDate);
	const query = useQuery({
		queryKey: [
			"calendly",
			"widget",
			handle,
			item.id,
			selectedDate.getFullYear(),
			selectedDate.getMonth(),
		],
		enabled: Boolean(handle),
		retry: 1,
		queryFn: async ({ signal }) => {
			const params = new URLSearchParams({
				start_time: range.startTime,
				end_time: range.endTime,
			});
			const response = await fetch(
				`${apiUrl}/pages/${encodeURIComponent(handle ?? "")}/items/${encodeURIComponent(item.id)}/calendly?${params}`,
				{ signal },
			);
			if (!response.ok)
				throw new Error("Could not load Calendly availability.");
			const result = v.safeParse(
				calendlyWidgetResponseSchema,
				await response.json(),
			);
			if (!result.success)
				throw new Error("Could not load Calendly availability.");
			return result.output;
		},
	});
	const now = new Date();
	const event = query.data?.event ?? {
		uri: item.data.eventTypeUri,
		name: "Calendly event",
		duration: null,
		description: null,
		schedulingUrl: item.data.schedulingUrl,
		active: true,
	};
	const start = new Date(range.startTime);
	const end = new Date(range.endTime);
	const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
	const Widget =
		calendlyPresetComponents[
			(preset === "fullBanner"
				? "squareSmall"
				: preset) as keyof typeof calendlyPresetComponents
		];
	return (
		<Widget
			event={event}
			timeZone={timeZone ? { name: timeZone, label: timeZone } : null}
			availability={{
				loading: query.isPending,
				error: query.isError || query.data?.event === null,
				errorMessage: "Could not load availability.",
				times: query.data?.times ?? [],
				bookingUrl: event.schedulingUrl,
				selectedDate,
				timespanStart: start,
				timespanEnd: end,
				canGoToPreviousDay: selectedDate > now,
				canGoToNextDay: true,
				canGoToPreviousMonth:
					selectedDate.getFullYear() > now.getFullYear() ||
					(selectedDate.getFullYear() === now.getFullYear() &&
						selectedDate.getMonth() > now.getMonth()),
				canGoToNextMonth: true,
				onChangeDay: (offset) =>
					setSelectedDate((date) => {
						const next = new Date(date);
						next.setDate(next.getDate() + offset);
						return next;
					}),
				onChangeMonth: (offset) =>
					setSelectedDate(
						(date) => new Date(date.getFullYear(), date.getMonth() + offset, 1),
					),
			}}
			availabilityView={preset === "squareLarge" ? "calendar" : "slots"}
		/>
	);
}
