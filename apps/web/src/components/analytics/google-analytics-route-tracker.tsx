"use client";

import { usePathname } from "next/navigation";
import Script from "next/script";
import { useEffect, useState } from "react";
import {
	GA_MEASUREMENT_ID,
	initGoogleAnalytics,
	isGoogleAnalyticsEnabled,
	sendGoogleAnalyticsPageView,
} from "@/lib/google-analytics";

export default function GoogleAnalyticsRouteTracker() {
	const [enabled, setEnabled] = useState(false);
	const pathname = usePathname();

	useEffect(() => {
		if (!isGoogleAnalyticsEnabled(window.location.hostname)) return;
		initGoogleAnalytics();
		setEnabled(true);
	}, []);

	useEffect(() => {
		if (!enabled) return;
		// 제목이 바뀐 뒤에 보내도록 한 프레임 미룬다.
		const frame = requestAnimationFrame(() =>
			sendGoogleAnalyticsPageView(pathname),
		);
		return () => cancelAnimationFrame(frame);
	}, [enabled, pathname]);

	if (!enabled) return null;

	return (
		<Script
			src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
			strategy="afterInteractive"
		/>
	);
}
