import { env } from "@grabbin/env/web";

declare global {
	interface Window {
		dataLayer?: unknown[];
		gtag?: (...args: unknown[]) => void;
	}
}

const DEFAULT_GA_MEASUREMENT_ID = "G-69G89BFREL";
const INTERNAL_TRAFFIC_STORAGE_KEY = "grabbin:ga-internal";

export const GA_MEASUREMENT_ID =
	env.NEXT_PUBLIC_GA_MEASUREMENT_ID ?? DEFAULT_GA_MEASUREMENT_ID;

/** 이벤트 이름과 파라미터의 기준은 GA4 이벤트 스펙 문서다. 이름은 바꾸지 않는다. */
type GoogleAnalyticsEventParams = Record<
	string,
	string | number | boolean | undefined
>;

export type GoogleAnalyticsPageContext = {
	page_id: string;
	domain_type: "grabbin" | "custom";
	is_owner: boolean;
};

// 핸들 페이지가 화면에 있는 동안 모든 이벤트에 붙는 값.
let pageContext: GoogleAnalyticsPageContext | null = null;
// 같은 화면에서 page_view가 두 번 나가지 않게 마지막으로 보낸 주소를 기억한다.
let lastPageViewPath: string | null = null;
// 마지막으로 page_view를 보낸 화면 종류. 가입 화면의 entry_point에 쓴다.
let lastPageType: string | null = null;

// 운영 빌드에서만 켠다. 서비스 도메인(grabbin.me)과 사용자 커스텀 도메인 모두 포함.
export function isGoogleAnalyticsEnabled() {
	return process.env.NODE_ENV === "production";
}

function getServiceHostname() {
	const pageDomain = env.NEXT_PUBLIC_PAGE_DOMAIN ?? "grabbin.me";
	try {
		return new URL(
			pageDomain.includes("://") ? pageDomain : `https://${pageDomain}`,
		).hostname;
	} catch {
		return "grabbin.me";
	}
}

/** 사용자 커스텀 도메인에서 열린 화면인지. 로컬 주소는 grabbin으로 본다. */
export function isCustomDomainHost(hostname: string) {
	if (
		hostname === "localhost" ||
		hostname.endsWith(".localhost") ||
		hostname === "127.0.0.1"
	) {
		return false;
	}
	const serviceHostname = getServiceHostname();
	return (
		hostname !== serviceHostname && !hostname.endsWith(`.${serviceHostname}`)
	);
}

/** `?internal=1`이면 이 브라우저를 내부 사용자로 기억하고, `?internal=0`이면 지운다. */
function isInternalTraffic() {
	try {
		const flag = new URLSearchParams(window.location.search).get("internal");
		if (flag === "1") localStorage.setItem(INTERNAL_TRAFFIC_STORAGE_KEY, "1");
		if (flag === "0") localStorage.removeItem(INTERNAL_TRAFFIC_STORAGE_KEY);
		return localStorage.getItem(INTERNAL_TRAFFIC_STORAGE_KEY) === "1";
	} catch {
		return false;
	}
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
	if (isInternalTraffic()) window.gtag("set", { traffic_type: "internal" });
	window.gtag("config", GA_MEASUREMENT_ID, {
		// 첫 page_view도 직접 보낸다. 자동 page_view를 끄지 않으면 첫 화면이 두 번 세어진다.
		send_page_view: false,
		// 커스텀 도메인에서 grabbin.me로 넘어갈 때 같은 방문으로 이어지게 한다.
		linker: { domains: [getServiceHostname()] },
	});
}

export function setGoogleAnalyticsUserType(userType: "creator" | "visitor") {
	window.gtag?.("set", "user_properties", { user_type: userType });
}

export function trackGoogleAnalyticsEvent(
	name: string,
	params: GoogleAnalyticsEventParams = {},
) {
	window.gtag?.("event", name, { ...pageContext, ...params });
}

/** 같은 주소로 이미 보냈으면 다시 보내지 않는다(주소가 바뀌면 다시 보낸다). */
export function sendGoogleAnalyticsPageView(pageType: string) {
	const path = window.location.pathname;
	if (lastPageViewPath === path) return;
	lastPageViewPath = path;
	lastPageType = pageType;
	trackGoogleAnalyticsEvent("page_view", {
		page_type: pageType,
		page_path: path,
		page_location: window.location.href,
		page_title: document.title,
	});
}

/** 사이트 안에서 이동해 왔다면 직전 화면 종류, 새로 열었다면 null. */
export function getLastGoogleAnalyticsPageType() {
	return lastPageType;
}

/** 핸들 페이지가 열리면 값을 넣고, 닫히면 비운다. 비울 때 page_view 기록도 초기화한다. */
export function setGoogleAnalyticsPageContext(
	context: GoogleAnalyticsPageContext | null,
) {
	pageContext = context;
	if (!context) lastPageViewPath = null;
}

const STATIC_PAGE_TYPES: Record<string, string> = {
	create: "create",
	demo: "demo",
	pricing: "pricing",
	privacy: "privacy",
	"sign-in": "sign_in",
	terms: "terms",
	update: "update",
};

/**
 * 주소로 화면 종류를 정한다. 핸들 페이지(커스텀 도메인 포함)는 "handle"이고,
 * 핸들 페이지의 page_view는 page_id를 알고 있는 핸들 페이지 화면이 직접 보낸다.
 */
export function getGoogleAnalyticsPageType(pathname: string, hostname: string) {
	if (isCustomDomainHost(hostname)) return "handle";
	const [firstSegment, ...rest] = pathname.split("/").filter(Boolean);
	if (!firstSegment) return "home";
	const staticType = STATIC_PAGE_TYPES[firstSegment];
	if (staticType) return staticType;
	return rest.length === 0 ? "handle" : "other";
}
