import type { CalendlyEventType } from "@grabbin/api";
import { getPresetGeometry } from "@grabbin/bento-layout";
import type { BentoItem } from "@/lib/bento/bento-types";
import { AdvancedWidgetPresetControls } from "../preset-controls";
import { AdvancedWidgetPreviewFrame } from "../preview-frame";
import {
	advancedWidgetPresets,
	useAdvancedWidgetPreset,
} from "../use-advanced-widget-preset";
import type { CalendlyAvailability } from "./widget";
import { calendlyPresetComponents } from "./widget";

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
	const {
		preset,
		visiblePreset,
		transitionPhase,
		onPresetChange,
		onTransitionComplete,
	} = useAdvancedWidgetPreset(advancedWidgetPresets.calendly, "landscape");
	const item: BentoItem = {
		...previewItem,
		preset: visiblePreset,
		layouts: {
			wide: getPresetGeometry(visiblePreset, "wide"),
			compact: getPresetGeometry(visiblePreset, "compact"),
		},
	};
	const CalendlyWidget =
		visiblePreset === "fullBanner"
			? calendlyPresetComponents.landscape
			: calendlyPresetComponents[visiblePreset];
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
		<AdvancedWidgetPreviewFrame
			item={item}
			transitionPhase={transitionPhase}
			onTransitionComplete={onTransitionComplete}
			controls={
				<AdvancedWidgetPresetControls
					presets={advancedWidgetPresets.calendly}
					preset={preset}
					onPresetChange={onPresetChange}
				/>
			}
		>
			<CalendlyWidget
				event={previewEvent}
				timeZone={{ name: "UTC", label: "UTC" }}
				availability={availability}
				availabilityView={
					visiblePreset === "squareLarge" ? "calendar" : "slots"
				}
			/>
		</AdvancedWidgetPreviewFrame>
	);
}
