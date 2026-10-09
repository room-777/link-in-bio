import { Button } from "@grabbin/ui/components/button";
import { ScrollArea } from "@grabbin/ui/components/scroll-area";
import { advancedWidgetModules } from "@/constant/widget/advanced-widget-registry";
import {
	AdvancedWidgetBadges,
	AdvancedWidgetIcon,
} from "./advanced-widget-visuals";

export default function AdvancedWidgetList({
	onSelect,
	searchQuery,
}: {
	onSelect: (widgetId: string) => void;
	searchQuery: string;
}) {
	const normalizedQuery = searchQuery.trim().toLowerCase();
	const widgets = advancedWidgetModules.filter((item) =>
		item.label.toLowerCase().includes(normalizedQuery),
	);

	return (
		<ScrollArea className="[&_[data-slot=scroll-area-viewport]]:scroll-fade-y [&_[data-slot=scroll-area-viewport]]:scrollbar-none size-full min-h-0 [&_[data-slot=scroll-area-scrollbar]]:hidden">
			<div className="space-y-5 py-1">
				{widgets.length > 0 ? (
					<div className="grid grid-cols-2 gap-2">
						{widgets.map((item) => (
							<Button
								key={item.id}
								type="button"
								variant="outline"
								className={`h-11 min-w-0 gap-2 px-2.5 ${item.badges.length ? "justify-between" : "justify-start"}`}
								onClick={() => onSelect(item.id)}
							>
								<span className="flex min-w-0 items-center gap-2">
									<AdvancedWidgetIcon widget={item} className="size-5" />
									<span className="truncate text-sm">{item.label}</span>
								</span>
								<AdvancedWidgetBadges
									badges={item.badges}
									sizeClassName="size-5.5"
								/>
							</Button>
						))}
					</div>
				) : (
					<p className="px-1 py-2 text-muted-foreground text-sm">
						No widgets found.
					</p>
				)}
			</div>
		</ScrollArea>
	);
}
