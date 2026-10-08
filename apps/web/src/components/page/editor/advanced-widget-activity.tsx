import type { CalendlyEventType } from "@grabbin/api";
import { advancedWidgetModules } from "@/constant/widget/advanced-widget-registry";

export default function AdvancedWidgetActivity({
	widgetId,
	onCalendlyAdd,
	onRssFeedAdd,
}: {
	widgetId: string;
	onCalendlyAdd: (event: CalendlyEventType) => Promise<void>;
	onRssFeedAdd: (url: string) => Promise<boolean>;
}) {
	const widget = advancedWidgetModules.find(({ id }) => id === widgetId);
	if (!widget) return null;

	const Details = widget.details;
	return (
		<div className="h-full min-h-0">
			<Details onAdd={onCalendlyAdd} onRssFeedAdd={onRssFeedAdd} />
		</div>
	);
}
