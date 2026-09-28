"use client";

import Script from "next/script";
import { useEffect, useState } from "react";

declare global {
	interface Window {
		sa_pageview?: (path?: string) => void;
	}
}

export default function SimpleAnalyticsTracker({ pageId }: { pageId: string }) {
	const [ready, setReady] = useState(false);

	useEffect(() => {
		if (!ready || window.location.hostname !== "grabbin.me") return;
		window.sa_pageview?.(`/__analytics/pages/${encodeURIComponent(pageId)}`);
	}, [pageId, ready]);

	return (
		<Script
			src="https://scripts.simpleanalyticscdn.com/latest.js"
			strategy="afterInteractive"
			data-auto-collect="false"
			onReady={() => setReady(true)}
		/>
	);
}
