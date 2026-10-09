"use client";

import {
	bentoGridMetrics,
	getBentoWidth,
	getColumns,
	getPresetGeometry,
} from "@grabbin/bento-layout";
import {
	type CalendlyAvailability,
	type CalendlyPreset,
	calendlyPresetComponents,
} from "@/components/page/editor/advanced-widgets/calendly/widget";
import {
	calendlyDemoAvailabilityTimes,
	calendlyDemoDateRange,
	calendlyDemoEvent,
} from "@/constant/widget/calendly";

const calendlyPresets: CalendlyPreset[] = [
	"squareSmall",
	"halfBanner",
	"landscape",
	"portrait",
	"squareLarge",
];

export function CalendlyPresetGallery() {
	const today = new Date(calendlyDemoDateRange.today);
	const selectedDate = new Date(calendlyDemoDateRange.selectedDate);
	const lastDay = new Date(calendlyDemoDateRange.lastDay);
	const availability: CalendlyAvailability = {
		loading: false,
		error: false,
		times: calendlyDemoAvailabilityTimes,
		displayTimeZone: "Asia/Seoul",
		bookingUrl: calendlyDemoEvent.schedulingUrl,
		selectedDate,
		timespanStart: today,
		timespanEnd: lastDay,
		canGoToPreviousDay: true,
		canGoToNextDay: true,
		canGoToPreviousMonth: false,
		canGoToNextMonth: true,
		onChangeDay: () => {},
		onChangeMonth: () => {},
	};
	const { margin, rowHeight } = bentoGridMetrics.compact;
	const columns = getColumns("compact");
	const columnWidth =
		(getBentoWidth("compact") - margin[0] * (columns - 1)) / columns;
	const gridPositions: Record<CalendlyPreset, [number, number]> = {
		squareSmall: [2, 4],
		halfBanner: [0, 6],
		landscape: [0, 4],
		portrait: [2, 0],
		squareLarge: [0, 0],
	};

	return (
		<div
			className="mx-auto grid w-fit"
			style={{
				gridTemplateColumns: `repeat(3, ${columnWidth}px)`,
				gridAutoRows: `${rowHeight}px`,
				gap: `${margin[0]}px`,
			}}
		>
			{calendlyPresets.map((preset) => {
				const PresetWidget = calendlyPresetComponents[preset];
				const { w, h } = getPresetGeometry(preset, "compact");
				const [x, y] = gridPositions[preset];
				return (
					<div
						key={preset}
						style={{
							gridColumn: `${x + 1} / span ${w}`,
							gridRow: `${y + 1} / span ${h}`,
						}}
					>
						<PresetWidget
							event={calendlyDemoEvent}
							timeZone={{ name: "Asia/Seoul", label: "GMT+9" }}
							availability={availability}
							availabilityView={preset === "squareLarge" ? "calendar" : "slots"}
						/>
					</div>
				);
			})}
		</div>
	);
}
