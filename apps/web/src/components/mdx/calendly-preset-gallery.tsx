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
import { BentoItemShell } from "@/components/page/editor/bento/bento-item-shell";
import {
	calendlyDemoAvailabilityTimes,
	calendlyDemoDateRange,
	calendlyDemoEvent,
} from "@/constant/widget/calendly";
import type { BentoItem } from "@/lib/bento/bento-types";

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
				const item: BentoItem = {
					id: `calendly-gallery-${preset}`,
					type: "calendly",
					data: {
						eventTypeUri: calendlyDemoEvent.uri,
						schedulingUrl: calendlyDemoEvent.schedulingUrl,
					},
					style: {},
					layouts: {
						wide: getPresetGeometry(preset, "wide"),
						compact: getPresetGeometry(preset, "compact"),
					},
					createdAt: calendlyDemoDateRange.today,
					updatedAt: calendlyDemoDateRange.today,
					preset,
				};
				return (
					<div
						key={preset}
						style={{
							gridColumn: `${x + 1} / span ${w}`,
							gridRow: `${y + 1} / span ${h}`,
						}}
					>
						<BentoItemShell
							item={item}
							breakpoint="compact"
							mode="view"
							autoFocus={false}
							disableCardLink
						>
							<PresetWidget
								event={calendlyDemoEvent}
								timeZone={{ name: "Asia/Seoul", label: "GMT+9" }}
								availability={availability}
								availabilityView={
									preset === "squareLarge" ? "calendar" : "slots"
								}
							/>
						</BentoItemShell>
					</div>
				);
			})}
		</div>
	);
}
