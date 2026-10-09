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

export function AdvancedWidgetBadges({
	badges,
	sizeClassName,
}: {
	badges: AdvancedWidgetModule["badges"];
	sizeClassName: string;
}) {
	if (!badges.length) return null;
	return (
		<span className="flex shrink-0 -space-x-3 rounded-md" aria-hidden="true">
			{badges.map((badge, index) => (
				<span
					key={badge.id}
					className={`${sizeClassName} overflow-hidden rounded-full bg-background outline-depth`}
					style={{ zIndex: index + 1 }}
				>
					<img
						src={badge.iconUrl}
						alt={badge.label}
						className="size-full rounded-[inherit] object-contain"
					/>
				</span>
			))}
		</span>
	);
}
