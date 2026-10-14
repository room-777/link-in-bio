import { env } from "@grabbin/env/web";
import { isSimpleAnalyticsHost } from "@/lib/simple-analytics";

declare global {
	interface Window {
		dataLayer?: unknown[];
		gtag?: (...args: unknown[]) => void;
	}
}

const DEFAULT_GA_MEASUREMENT_ID = "G-69G89BFREL";

export const GA_MEASUREMENT_ID =
	env.NEXT_PUBLIC_GA_MEASUREMENT_ID ?? DEFAULT_GA_MEASUREMENT_ID;

// 운영 빌드 + 서비스 도메인(grabbin.me)에서만 켠다. 로컬·개발·커스텀 도메인은 제외.
export function isGoogleAnalyticsEnabled(hostname: string) {
	return (
		process.env.NODE_ENV === "production" && isSimpleAnalyticsHost(hostname)
	);
}

export function initGoogleAnalytics() {
	if (window.gtag) return;
	window.dataLayer = window.dataLayer ?? [];
	window.gtag = function gtag() {
		// gtag.js는 arguments 객체 자체를 dataLayer에 넣어야 동작한다.
		// biome-ignore lint/complexity/noArguments: gtag.js 규약
		window.dataLayer?.push(arguments);
	};
	window.gtag("js", new Date());
	// 첫 page_view도 직접 보낸다. 자동 page_view를 끄지 않으면 첫 화면이 두 번 세어진다.
	window.gtag("config", GA_MEASUREMENT_ID, { send_page_view: false });
}

export function sendGoogleAnalyticsPageView(pathname: string) {
	window.gtag?.("event", "page_view", {
		page_path: pathname,
		page_location: window.location.href,
		page_title: document.title,
	});
}
