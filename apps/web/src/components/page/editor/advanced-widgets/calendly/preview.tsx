import type { CalendlyEventType } from "@grabbin/api";
import { getPresetGeometry } from "@grabbin/bento-layout";
import type { BentoItem } from "@/lib/bento/bento-types";
import { AdvancedWidgetPreviewFrame } from "../preview-frame";
import type { CalendlyAvailability } from "./widget";
import { CalendlyLandscape } from "./widget";

const previewEvent: CalendlyEventType = {
	uri: "https://api.calendly.com/event_types/preview",
	name: "Introductory meeting",
	duration: 30,
	description: "A quick introduction",
	schedulingUrl: "https://calendly.com/example/intro",
	active: true,
};

const previewDate = new Date("2026-10-09T12:00:00.000Z");
const previewItem: BentoItem = {
	id: "advanced-widget-preview-calendly",
	type: "calendly",
	data: {
		eventTypeUri: previewEvent.uri,
		schedulingUrl: previewEvent.schedulingUrl,
	},
	style: {},
	layouts: {
		wide: getPresetGeometry("landscape", "wide"),
		compact: getPresetGeometry("landscape", "compact"),
	},
	createdAt: "2026-10-09T00:00:00.000Z",
	updatedAt: "2026-10-09T00:00:00.000Z",
	preset: "landscape",
};

export function CalendlyAdvancedWidgetPreview() {
	const availability: CalendlyAvailability = {
		loading: false,
		error: false,
		times: [9, 10, 13, 14].map((hour) => ({
			startTime: `2026-10-09T${String(hour).padStart(2, "0")}:00:00.000Z`,
			schedulingUrl: previewEvent.schedulingUrl,
		})),
		displayTimeZone: "UTC",
		bookingUrl: previewEvent.schedulingUrl,
		selectedDate: previewDate,
		timespanStart: previewDate,
		timespanEnd: new Date("2026-10-16T12:00:00.000Z"),
		canGoToPreviousDay: false,
		canGoToNextDay: true,
		canGoToPreviousMonth: false,
		canGoToNextMonth: true,
		onChangeDay: () => {},
		onChangeMonth: () => {},
	};

	return (
		<AdvancedWidgetPreviewFrame item={previewItem}>
			<CalendlyLandscape
				event={previewEvent}
				timeZone={{ name: "UTC", label: "UTC" }}
				availability={availability}
				availabilityView="slots"
			/>
		</AdvancedWidgetPreviewFrame>
	);
}
