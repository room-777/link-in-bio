"use client";

import { useEffect, useRef } from "react";
import {
	isSimpleAnalyticsHost,
	SIMPLE_ANALYTICS_READY_EVENT,
} from "@/lib/simple-analytics";

export default function SimpleAnalyticsTracker({ pageId }: { pageId: string }) {
	const trackedPageId = useRef<string | null>(null);

	useEffect(() => {
		if (
			!isSimpleAnalyticsHost(window.location.hostname) ||
			trackedPageId.current === pageId
		) {
			return;
		}

		const trackPageview = () => {
			if (!window.sa_pageview) return;

			trackedPageId.current = pageId;
			window.sa_pageview(`/__analytics/pages/${encodeURIComponent(pageId)}`);
		};

		if (window.sa_pageview) {
			trackPageview();
			return;
		}

		window.addEventListener(SIMPLE_ANALYTICS_READY_EVENT, trackPageview, {
			once: true,
		});
		return () => {
			window.removeEventListener(SIMPLE_ANALYTICS_READY_EVENT, trackPageview);
		};
	}, [pageId]);

	return null;
}
