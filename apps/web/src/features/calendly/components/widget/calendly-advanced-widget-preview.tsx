import type { CalendlyEventType } from "@grabbin/api";
import { getAllowedPresets, getPresetGeometry } from "@grabbin/bento-layout";
import { AdvancedWidgetPresetControls } from "@/components/page/editor/advanced-widget-preset-controls";
import { AdvancedWidgetPreviewFrame } from "@/components/page/editor/advanced-widgets/advanced-widget-preview-frame";
import { useAdvancedWidgetPreset } from "@/components/page/editor/advanced-widgets/use-advanced-widget-preset";
import type { BentoItem } from "@/features/page/editor/state/bento-types";
import type { CalendlyAvailability } from "./calendly-widget";
import { CalendlyWidget } from "./calendly-widget";

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

export default function CalendlyAdvancedWidgetPreview() {
	const {
		preset,
		visiblePreset,
		transitionPhase,
		onPresetChange,
		onTransitionComplete,
	} = useAdvancedWidgetPreset(getAllowedPresets("calendly"), "landscape");
	const item: BentoItem = {
		...previewItem,
		preset: visiblePreset,
		layouts: {
			wide: getPresetGeometry(visiblePreset, "wide"),
			compact: getPresetGeometry(visiblePreset, "compact"),
		},
	};
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
					presets={getAllowedPresets("calendly")}
					preset={preset}
					onPresetChange={onPresetChange}
				/>
			}
		>
			<CalendlyWidget
				preset={visiblePreset === "fullBanner" ? "landscape" : visiblePreset}
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

export { CalendlyAdvancedWidgetPreview };
