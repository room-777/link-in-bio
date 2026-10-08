import { type LinkProviderId, providerDefinitions } from "@grabbin/page-link";
import { advancedWidgetModules } from "@/constant/widget/advanced-widget-registry";

export default function AdvancedWidgetActivity({
	providerId,
}: {
	providerId: LinkProviderId;
}) {
	const provider = providerDefinitions.find(({ id }) => id === providerId);
	if (!provider) return null;
	const Details = advancedWidgetModules.find(
		(widget) => widget.providerId === provider.id,
	)?.details;

	if (Details) {
		return (
			<div className="h-full min-h-0">
				<Details />
			</div>
		);
	}

	return (
		<div className="flex h-full flex-col items-center justify-center gap-4 px-4 text-center">
			<img
				src={provider.faviconUrl}
				alt=""
				className="size-12 object-contain"
			/>
			<p className="max-w-xs text-muted-foreground text-sm">
				Add a {provider.label} link to your page.
			</p>
		</div>
	);
}
