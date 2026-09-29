"use client";

import { usePathname } from "next/navigation";
import Script from "next/script";
import { useEffect, useRef, useState } from "react";
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
	const trackedPathname = useRef<string | null>(null);

	useEffect(() => {
		if (!isSimpleAnalyticsHost(window.location.hostname)) return;

		const trackPageview = () => {
			const pathSegments = pathname.split("/").filter(Boolean);
			const isHandleRoute =
				pathSegments.length === 1 &&
				!STATIC_SINGLE_SEGMENT_ROUTES.has(pathname);

			if (
				!window.sa_pageview ||
				isHandleRoute ||
				trackedPathname.current === pathname
			) {
				return;
			}

			trackedPathname.current = pathname;
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
