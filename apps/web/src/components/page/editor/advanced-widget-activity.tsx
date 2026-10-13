import { advancedWidgetModules } from "@/constant/widget/advanced-widget-registry";

export default function AdvancedWidgetActivity({
	widgetId,
	onClose,
}: {
	widgetId: string;
	onClose: () => void;
}) {
	const widget = advancedWidgetModules.find(({ id }) => id === widgetId);
	if (!widget) return null;

	const Activity = widget.activity;
	return <Activity onClose={onClose} badges={widget.badges} />;
}
