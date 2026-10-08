import type { RssFeedResponse } from "@grabbin/api";
import { resolveLinkProvider } from "@grabbin/page-link";

type RssPlatform = RssFeedResponse["source"]["platform"];
type RssSourceType = RssFeedResponse["source"]["type"];

export type RssSource = {
	inputUrl: string;
	pageUrl: string;
	feedUrl: string;
	platform: RssPlatform;
	type: RssSourceType;
	iconUrl: string;
};

function getPathSegments(url: URL) {
	return url.pathname.split("/").filter(Boolean);
}

function buildSource(
	pageUrl: URL,
	feedPath: string,
	platform: RssPlatform,
	type: RssSourceType,
): RssSource {
	return {
		inputUrl: pageUrl.toString(),
		pageUrl: pageUrl.toString(),
		feedUrl: new URL(feedPath, pageUrl.origin).toString(),
		platform,
		type,
		iconUrl:
			resolveLinkProvider(pageUrl).definition?.faviconUrl ??
			`/api/provider-icons/${platform}.svg`,
	};
}

function resolveFeedUrl(url: URL, segments: string[]) {
	if (url.hostname === "medium.com" && segments[0] === "feed") {
		const path = segments[1];
		if (segments.length !== 2 || !path) return undefined;
		if (path.startsWith("@"))
			return buildSource(
				new URL(`/${path}`, url.origin),
				url.pathname,
				"medium",
				"profile",
			);
		if (!/(?:^|-)\w{12,}$/.test(path))
			return buildSource(
				new URL(`/${path}`, url.origin),
				url.pathname,
				"medium",
				"publication",
			);
	}
	if (
		url.hostname.endsWith(".substack.com") &&
		segments.length === 1 &&
		segments[0] === "feed"
	)
		return buildSource(
			new URL("/", url.origin),
			url.pathname,
			"substack",
			"publication",
		);
	if (url.hostname === "note.com" && segments.at(-1) === "rss") {
		const pagePath = `/${segments.slice(0, -1).join("/")}`;
		if (segments.length === 2)
			return buildSource(
				new URL(pagePath, url.origin),
				url.pathname,
				"note",
				"profile",
			);
		if (
			segments.length === 4 &&
			segments[1] === "m" &&
			segments[2]?.startsWith("m")
		)
			return buildSource(
				new URL(pagePath, url.origin),
				url.pathname,
				"note",
				"magazine",
			);
	}
	if (url.hostname.endsWith(".ghost.io") && segments.at(-1) === "rss") {
		const pagePath = `/${segments.slice(0, -1).join("/")}`;
		if (segments.length === 1)
			return buildSource(
				new URL(pagePath, url.origin),
				url.pathname,
				"ghost",
				"blog",
			);
		if (segments.length === 3 && segments[0] === "author")
			return buildSource(
				new URL(pagePath, url.origin),
				url.pathname,
				"ghost",
				"profile",
			);
	}
	if (
		(url.hostname.endsWith(".hashnode.dev") ||
			url.hostname.endsWith(".hashnode.com")) &&
		segments.length === 1 &&
		segments[0] === "rss.xml"
	)
		return buildSource(
			new URL("/", url.origin),
			url.pathname,
			"hashnode",
			"publication",
		);
	return undefined;
}

function resolveMediumSource(url: URL, segments: string[]) {
	if (url.hostname !== "medium.com") return undefined;
	if (segments.length === 1 && segments[0]?.startsWith("@")) {
		return buildSource(url, `/feed/${segments[0]}`, "medium", "profile");
	}
	if (
		segments.length === 1 &&
		segments[0] !== "feed" &&
		!/(?:^|-)\w{12,}$/.test(segments[0] ?? "")
	) {
		return buildSource(url, `/feed/${segments[0]}`, "medium", "publication");
	}
	return undefined;
}

function resolveSubstackSource(url: URL, segments: string[]) {
	if (!url.hostname.endsWith(".substack.com")) return undefined;
	if (segments.some((segment) => segment === "p")) return undefined;
	return buildSource(url, "/feed", "substack", "publication");
}

function resolveNoteSource(url: URL, segments: string[]) {
	if (url.hostname !== "note.com") return undefined;
	if (segments.length === 1) {
		return buildSource(url, `/${segments[0]}/rss`, "note", "profile");
	}
	if (
		segments.length === 3 &&
		segments[1] === "m" &&
		segments[2]?.startsWith("m")
	) {
		return buildSource(
			url,
			`${url.pathname.replace(/\/$/, "")}/rss`,
			"note",
			"magazine",
		);
	}
	return undefined;
}

function resolveGhostSource(url: URL, segments: string[]) {
	if (!url.hostname.endsWith(".ghost.io")) return undefined;
	if (segments.length === 0) return buildSource(url, "/rss/", "ghost", "blog");
	if (segments.length === 2 && segments[0] === "author") {
		return buildSource(
			url,
			`${url.pathname.replace(/\/$/, "")}/rss/`,
			"ghost",
			"profile",
		);
	}
	return undefined;
}

function resolveHashnodeSource(url: URL, segments: string[]) {
	if (
		(!url.hostname.endsWith(".hashnode.dev") &&
			!url.hostname.endsWith(".hashnode.com")) ||
		segments.length > 0
	)
		return undefined;
	return buildSource(url, "/rss.xml", "hashnode", "publication");
}

export function resolveRssSource(input: string): RssSource | undefined {
	let url: URL;
	try {
		url = new URL(input);
	} catch {
		return undefined;
	}
	if (url.protocol !== "https:" || url.username || url.password)
		return undefined;
	url.hostname = url.hostname.toLowerCase().replace(/^www\./, "");
	url.hash = "";
	url.search = "";
	const segments = getPathSegments(url);
	const source =
		resolveFeedUrl(url, segments) ??
		resolveMediumSource(url, segments) ??
		resolveSubstackSource(url, segments) ??
		resolveNoteSource(url, segments) ??
		resolveGhostSource(url, segments) ??
		resolveHashnodeSource(url, segments);
	return source ? { ...source, inputUrl: input } : undefined;
}
