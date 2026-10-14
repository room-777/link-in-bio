"use client";

import { useAdvancedWidgetActions } from "@/features/page/editor/contexts/advanced-widget-actions-context";
import type { AdvancedWidgetActivityProps } from "@/features/page/editor/types";
import { CalendlyAdvancedWidgetPreview } from "./calendly-advanced-widget-preview";
import CalendlyWidgetDetails from "./calendly-widget-details";

export default function CalendlyWidgetActivity({
	onClose,
}: AdvancedWidgetActivityProps) {
	const actions = useAdvancedWidgetActions();
	return (
		<div className="flex h-full min-h-0 flex-col gap-6">
			<CalendlyAdvancedWidgetPreview />
			<div className="min-h-0 flex-1">
				<CalendlyWidgetDetails
					onAdd={async (event) => {
						await actions.onCalendlyAdd(event);
						onClose();
					}}
				/>
			</div>
		</div>
	);
}
