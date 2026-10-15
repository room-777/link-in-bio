import { advancedWidgetModules } from "@/constant/widget/advanced-widget-registry";
import CalendlyWidgetActivity from "@/features/calendly/components/widget/calendly-widget-activity";
import type { AdvancedWidgetActions } from "@/features/page/editor/types";
import RssWidgetActivity from "@/features/rss/components/widget/rss-widget-activity";
import SpotifyWidgetActivity from "@/features/spotify/components/widget/spotify-widget-activity";
import TweetWidgetActivity from "@/features/tweet/components/widget/tweet-widget-activity";

export default function AdvancedWidgetActivity({
	widgetId,
	actions,
	onClose,
}: {
	widgetId: string;
	actions: AdvancedWidgetActions;
	onClose: () => void;
}) {
	const widget = advancedWidgetModules.find(({ id }) => id === widgetId);
	if (!widget) return null;

	switch (widget.id) {
		case "calendly":
			return (
				<CalendlyWidgetActivity
					onAdd={actions.onCalendlyAdd}
					onClose={onClose}
				/>
			);
		case "rss-feed":
			return (
				<RssWidgetActivity
					onAdd={actions.onRssFeedAdd}
					onPreview={actions.onRssFeedPreview}
					badges={widget.badges}
					onClose={onClose}
				/>
			);
		case "spotify":
			return (
				<SpotifyWidgetActivity
					onAdd={actions.onSpotifyAdd}
					onPreview={actions.onSpotifyPreview}
					onClose={onClose}
				/>
			);
		case "tweet":
			return (
				<TweetWidgetActivity onAdd={actions.onTweetAdd} onClose={onClose} />
			);
		case "soundcloud":
		case "apple-music":
		case "signature":
			return (
				<div className="flex h-full items-center justify-center text-muted-foreground text-sm">
					Sipping coffee while crafting a polished widget...
				</div>
			);
		default: {
			const unhandled: never = widget.id;
			return unhandled;
		}
	}
}
