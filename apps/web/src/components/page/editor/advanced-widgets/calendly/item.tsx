"use client";

import type { PageItemResponse } from "@grabbin/api";
import type { PresetName } from "@grabbin/bento-layout";
import { useState } from "react";
import {
	getCalendlyAvailabilityRange,
	useCalendlyAvailabilityQuery,
} from "@/query/calendly/query";
import { calendlyPresetComponents } from "./widget";

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
	const range = getCalendlyAvailabilityRange(selectedDate);
	const query = useCalendlyAvailabilityQuery(handle, item.id, selectedDate);
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
				loading: query.isLoading,
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
