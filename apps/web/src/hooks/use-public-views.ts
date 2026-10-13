"use client";

import { useEffect, useState } from "react";
import { usePublicViewsQuery } from "@/query/page/public-views";

export function usePublicViews(handle?: string) {
	const [timezone, setTimezone] = useState<string | null>(null);

	useEffect(() => {
		setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC");
	}, []);

	const query = usePublicViewsQuery(handle, timezone);

	return { handle, timezone, ...query };
}
