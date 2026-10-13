import type { AdvancedWidgetModule } from "@/constant/widget/advanced-widget-registry";

export default function AdvancedWidgetBadges({
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

export { AdvancedWidgetBadges };
