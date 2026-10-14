"use client";

import Script from "next/script";
import { useEffect, useState } from "react";
import {
	GA_MEASUREMENT_ID,
	initGoogleAnalytics,
	isGoogleAnalyticsEnabled,
} from "@/lib/google-analytics";

// 페이지 조회는 GA 향상된 측정(브라우저 기록 이벤트 기반 페이지 변경)이 자동으로 센다.
export default function GoogleAnalytics() {
	const [enabled, setEnabled] = useState(false);

	useEffect(() => {
		if (!isGoogleAnalyticsEnabled(window.location.hostname)) return;
		initGoogleAnalytics();
		setEnabled(true);
	}, []);

	if (!enabled) return null;

	return (
		<Script
			src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
			strategy="afterInteractive"
		/>
	);
}
