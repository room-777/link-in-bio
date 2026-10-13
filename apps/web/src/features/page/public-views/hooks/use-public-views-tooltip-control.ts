"use client";

import { useEffect, useState } from "react";
import { getPublicViewsTooltipControl } from "@/features/page/public-views/components/public-views-tooltip-control";
import { usePublicViewsQuery } from "@/features/page/public-views/queries/public-views";

function usePublicViews(handle?: string) {
	const [timezone, setTimezone] = useState<string | null>(null);

	useEffect(() => {
		setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC");
	}, []);

	const query = usePublicViewsQuery(handle, timezone);

	return { handle, timezone, ...query };
}

export function usePublicViewsTooltipControl(handle?: string) {
	return getPublicViewsTooltipControl(usePublicViews(handle));
}
