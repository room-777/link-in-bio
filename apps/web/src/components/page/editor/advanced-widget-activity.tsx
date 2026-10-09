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
	const Preview = widget.preview;

	return (
		<div className="flex h-full min-h-0 flex-col gap-6">
			<Preview />
			<div className="min-h-0 flex-1">
				<Details
					onAdd={onCalendlyAdd}
					onRssFeedAdd={onRssFeedAdd}
					badges={widget.badges}
				/>
			</div>
		</div>
	);
}
