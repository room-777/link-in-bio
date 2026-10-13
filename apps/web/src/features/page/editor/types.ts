export type AdvancedWidgetActivityProps = {
	onClose: () => void;
	badges: readonly { id: string; label: string; iconUrl: string }[];
};
