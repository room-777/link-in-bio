import type { CalendlyAvailabilityTime, CalendlyEventType } from "@grabbin/api";

export const calendlyDemoEvent: CalendlyEventType = {
	uri: "https://api.calendly.com/event_types/example",
	name: "Marketing session call",
	duration: 30,
	description: null,
	schedulingUrl: "https://calendly.com",
	active: true,
};

export const calendlyDemoAvailabilityTimes: CalendlyAvailabilityTime[] = [
	8, 9, 12, 14, 16, 19, 21, 23, 26, 28, 30,
].flatMap((day) =>
	[10, 11, 13].map((hour) => ({
		startTime: new Date(Date.UTC(2026, 9, day, hour)).toISOString(),
		schedulingUrl: calendlyDemoEvent.schedulingUrl,
	})),
);

export const calendlyDemoDateRange = {
	today: "2026-10-07T12:00:00.000Z",
	selectedDate: "2026-10-08T12:00:00.000Z",
	lastDay: "2026-11-06T12:00:00.000Z",
};
