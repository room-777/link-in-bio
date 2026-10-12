import type { AnimatedTooltipControl } from "@grabbin/ui/components/animated-tooltip";
import { Button } from "@grabbin/ui/components/button";
import { Skeleton } from "@grabbin/ui/components/skeleton";
import type { usePublicViews } from "@/hooks/use-public-views";
import SpinningCounter from "./spinning-counter";

type PublicViewsState = ReturnType<typeof usePublicViews>;

function getUnavailableTrigger() {
	return (
		<Button
			variant="ghost"
			size="lg"
			className="w-28 px-2 text-muted-foreground/80"
			aria-label="View count unavailable"
		>
			Views on break
		</Button>
	);
}

function getUnavailableControl(): AnimatedTooltipControl {
	return {
		id: "views-unavailable",
		trigger: getUnavailableTrigger(),
		content: "The view counter stepped out for a moment. Try again soon.",
	};
}

export function getPublicViewsTooltipControl({
	handle,
	timezone,
	data,
	isPending,
	isError,
}: PublicViewsState): AnimatedTooltipControl | null {
	if (!handle) return null;
	if (timezone === null || isPending) {
		return {
			id: "views-loading",
			element: <Skeleton aria-busy="true" className="h-8 w-28 rounded-md" />,
		};
	}
	if (isError || !data) return getUnavailableControl();

	const today = data.today;
	const yesterday = data.yesterday;

	return {
		id: "views",
		trigger: (
			<Button
				variant="ghost"
				size="lg"
				className="w-28 px-2 text-muted-foreground/80"
				aria-label={`${today?.count ?? 0} views today`}
			>
				<SpinningCounter value={today?.value ?? 0} />
				{today?.unit ?? ""}
				<span className="ml-0">views today</span>
			</Button>
		),
		content: `${yesterday?.value ?? 0}${yesterday?.unit ?? ""} views yesterday`,
	};
}
