"use client";

import { usePathname } from "next/navigation";
import Script from "next/script";
import { useEffect, useState } from "react";
import { authClient } from "@/lib/auth-client";
import {
	GA_MEASUREMENT_ID,
	getGoogleAnalyticsPageType,
	initGoogleAnalytics,
	isGoogleAnalyticsEnabled,
	sendGoogleAnalyticsPageView,
	setGoogleAnalyticsUserId,
	setGoogleAnalyticsUserType,
	trackGoogleAnalyticsEvent,
} from "@/lib/google-analytics";

export default function GoogleAnalyticsRouteTracker() {
	const [enabled, setEnabled] = useState(false);
	const pathname = usePathname();

	useEffect(() => {
		if (!isGoogleAnalyticsEnabled()) return;
		initGoogleAnalytics();
		setEnabled(true);
	}, []);

	useEffect(() => {
		if (!enabled) return;
		const pageType = getGoogleAnalyticsPageType(
			pathname,
			window.location.hostname,
		);
		// 핸들 페이지는 page_id를 아는 화면(GoogleAnalyticsPageView)이 직접 보낸다.
		if (pageType === "handle") return;
		// 제목이 바뀐 뒤에 보내도록 한 프레임 미룬다.
		const frame = requestAnimationFrame(() =>
			sendGoogleAnalyticsPageView(pageType),
		);
		return () => cancelAnimationFrame(frame);
	}, [enabled, pathname]);

	useEffect(() => {
		if (!enabled) return;
		const url = new URL(window.location.href);
		const eventName = url.searchParams.get("ga_event");
		if (eventName !== "sign_up" && eventName !== "login") return;

		const method = url.searchParams.get("ga_method");
		trackGoogleAnalyticsEvent(eventName, method ? { method } : {});
		url.searchParams.delete("ga_event");
		url.searchParams.delete("ga_method");
		window.history.replaceState(
			window.history.state,
			"",
			`${url.pathname}${url.search}${url.hash}`,
		);
	}, [enabled]);

	if (!enabled) return null;

	return (
		<>
			<GoogleAnalyticsUserType />
			<Script
				src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
				strategy="afterInteractive"
			/>
		</>
	);
}

function GoogleAnalyticsUserType() {
	const { data: session, isPending } = authClient.useSession();
	const isSignedIn = Boolean(session);
	const userId = session?.user.id ?? null;

	useEffect(() => {
		if (isPending) return;
		setGoogleAnalyticsUserId(userId);
		setGoogleAnalyticsUserType(isSignedIn ? "creator" : "visitor");
	}, [isPending, isSignedIn, userId]);

	return null;
}
