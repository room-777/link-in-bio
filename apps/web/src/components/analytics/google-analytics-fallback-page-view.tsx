"use client";

import { useEffect } from "react";
import { sendGoogleAnalyticsPageView } from "@/lib/google-analytics";

/**
 * 핸들 페이지를 찾지 못했거나 오류가 나서 GoogleAnalyticsPageView가 뜨지 않을 때
 * page_view를 대신 보낸다. 같은 주소로 이미 보냈으면 다시 보내지 않는다.
 */
export default function GoogleAnalyticsFallbackPageView({
	pageType,
}: {
	pageType: "not_found" | "error";
}) {
	useEffect(() => {
		const frame = requestAnimationFrame(() =>
			sendGoogleAnalyticsPageView(pageType),
		);
		return () => cancelAnimationFrame(frame);
	}, [pageType]);

	return null;
}
