import type { LinkProviderId } from "@grabbin/page-link";
import { Button } from "@grabbin/ui/components/button";
import { ScrollArea } from "@grabbin/ui/components/scroll-area";
import { advancedWidgetCategories } from "@/constant/widget/advanced-widget-registry";

export default function AdvancedWidgetList({
	onSelect,
	searchQuery,
}: {
	onSelect: (providerId: LinkProviderId) => void;
	searchQuery: string;
}) {
	const normalizedQuery = searchQuery.trim().toLowerCase();
	const categories = advancedWidgetCategories.flatMap((category) => {
		const categoryMatches = category.name
			.toLowerCase()
			.includes(normalizedQuery);
		const providers = categoryMatches
			? category.providers
			: category.providers.filter((provider) =>
					provider.label.toLowerCase().includes(normalizedQuery),
				);
		return providers.length > 0 ? [{ ...category, providers }] : [];
	});

	return (
		<ScrollArea className="[&_[data-slot=scroll-area-viewport]]:scroll-fade-y [&_[data-slot=scroll-area-viewport]]:scrollbar-none size-full min-h-0 [&_[data-slot=scroll-area-scrollbar]]:hidden">
			<div className="space-y-5 py-1 pr-3">
				{categories.length > 0 ? (
					categories.map((category) => (
						<section key={category.name} className="space-y-2">
							<h2 className="px-1 font-medium text-sm">{category.name}</h2>
							<div className="grid grid-cols-2 gap-2">
								{category.providers.map((provider) => (
									<Button
										key={provider.id}
										type="button"
										variant="outline"
										className="h-11 min-w-0 justify-start gap-2 px-2.5"
										onClick={() => onSelect(provider.id)}
									>
										<img
											src={provider.faviconUrl}
											alt=""
											className="size-5 shrink-0 object-contain"
										/>
										<span className="truncate text-sm">{provider.label}</span>
									</Button>
								))}
							</div>
						</section>
					))
				) : (
					<p className="px-1 py-2 text-muted-foreground text-sm">
						No widgets found.
					</p>
				)}
			</div>
		</ScrollArea>
	);
}
