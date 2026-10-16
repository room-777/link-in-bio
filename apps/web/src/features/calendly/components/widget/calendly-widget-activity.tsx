"use client";

import type { CalendlyEventType } from "@grabbin/api";

import { CalendlyAdvancedWidgetPreview } from "./calendly-advanced-widget-preview";
import CalendlyWidgetDetails from "./calendly-widget-details";

export default function CalendlyWidgetActivity({
	onClose,
	onAdd,
}: {
	onClose: () => void;
	onAdd: (event: CalendlyEventType) => Promise<void>;
}) {
	return (
		<div className="flex h-full min-h-0 flex-col gap-6">
			<CalendlyAdvancedWidgetPreview />
			<div className="min-h-0 flex-1">
				<CalendlyWidgetDetails
					onAdd={async (event) => {
						await onAdd(event);
						onClose();
					}}
				/>
			</div>
		</div>
	);
}
