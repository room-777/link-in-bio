import { env } from "@grabbin/env/web";

declare global {
	interface Window {
		sa_pageview?: (path?: string) => void;
	}
}

export const SIMPLE_ANALYTICS_READY_EVENT = "simpleanalytics:ready";

export function isSimpleAnalyticsHost(hostname: string) {
	const pageDomain = env.NEXT_PUBLIC_PAGE_DOMAIN ?? "grabbin.me";
	const pageUrl = pageDomain.includes("://")
		? pageDomain
		: `http://${pageDomain}`;

	try {
		return hostname === new URL(pageUrl).hostname;
	} catch {
		return false;
	}
}
