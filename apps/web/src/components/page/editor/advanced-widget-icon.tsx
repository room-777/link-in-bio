import { cn } from "@grabbin/ui/lib/utils";
import type { AdvancedWidgetModule } from "@/constant/widget/advanced-widget-registry";

export function AdvancedWidgetIcon({
	widget,
	className,
}: {
	widget: AdvancedWidgetModule;
	className: string;
}) {
	return (
		<span
			className={cn(
				"inline-flex shrink-0",
				widget.iconFrame && "overflow-hidden rounded-md outline-depth",
				widget.brandColor && "rounded-md",
			)}
			style={
				widget.brandColor ? { backgroundColor: widget.brandColor } : undefined
			}
			aria-hidden="true"
		>
			<img
				src={widget.iconUrl}
				alt=""
				className={cn(
					"object-contain",
					className,
					widget.id === "rss-feed" && "rotate-z-45",
					widget.brandColor && "brightness-0 invert",
				)}
			/>
		</span>
	);
}
