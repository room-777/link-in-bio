"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { getPublicViewsQueryOptions } from "@/query/page/public-views";

export function usePublicViews(handle?: string) {
	const [timezone, setTimezone] = useState<string | null>(null);

	useEffect(() => {
		setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC");
	}, []);

	const query = useQuery({
		...getPublicViewsQueryOptions(handle ?? "", timezone ?? "UTC"),
		enabled: Boolean(handle && timezone),
	});

	return { handle, timezone, ...query };
}
