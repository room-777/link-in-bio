"use client";

import { usePathname } from "next/navigation";
import Script from "next/script";
import { useEffect, useState } from "react";
import {
	isSimpleAnalyticsHost,
	SIMPLE_ANALYTICS_READY_EVENT,
} from "@/lib/simple-analytics";

const STATIC_SINGLE_SEGMENT_ROUTES = new Set([
	"/create",
	"/privacy",
	"/sign-in",
	"/terms",
	"/update",
]);

export default function SimpleAnalyticsRouteTracker() {
	const [enabled, setEnabled] = useState(false);
	const pathname = usePathname();

	useEffect(() => {
		if (!isSimpleAnalyticsHost(window.location.hostname)) return;

		let tracked = false;
		const trackPageview = () => {
			const pathSegments = pathname.split("/").filter(Boolean);
			const isHandleRoute =
				pathSegments.length === 1 &&
				!STATIC_SINGLE_SEGMENT_ROUTES.has(pathname);

			if (!window.sa_pageview || isHandleRoute || tracked) {
				return;
			}

			tracked = true;
			window.sa_pageview(pathname);
		};

		trackPageview();
		window.addEventListener(SIMPLE_ANALYTICS_READY_EVENT, trackPageview);
		return () => {
			window.removeEventListener(SIMPLE_ANALYTICS_READY_EVENT, trackPageview);
		};
	}, [pathname]);

	useEffect(() => {
		setEnabled(isSimpleAnalyticsHost(window.location.hostname));
	}, []);

	if (!enabled) return null;

	return (
		<Script
			src="https://scripts.simpleanalyticscdn.com/latest.js"
			strategy="afterInteractive"
			data-auto-collect="false"
			onReady={() => {
				window.dispatchEvent(new Event(SIMPLE_ANALYTICS_READY_EVENT));
			}}
		/>
	);
}
