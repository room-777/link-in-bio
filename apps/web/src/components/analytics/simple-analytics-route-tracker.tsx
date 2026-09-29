"use client";

import Script from "next/script";
import { useEffect, useState } from "react";
import {
	isSimpleAnalyticsHost,
	SIMPLE_ANALYTICS_READY_EVENT,
} from "@/lib/simple-analytics";

export default function SimpleAnalyticsRouteTracker() {
	const [enabled, setEnabled] = useState(false);

	useEffect(() => {
		setEnabled(isSimpleAnalyticsHost(window.location.hostname));
	}, []);

	if (!enabled) return null;

	return (
		<Script
			src="https://scripts.simpleanalyticscdn.com/latest.js"
			strategy="afterInteractive"
			data-auto-collect="true"
			onReady={() => {
				window.dispatchEvent(new Event(SIMPLE_ANALYTICS_READY_EVENT));
			}}
		/>
	);
}
