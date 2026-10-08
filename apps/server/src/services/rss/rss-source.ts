import type { RssFeedResponse } from "@grabbin/api";
import { resolveLinkProvider } from "@grabbin/page-link";

type RssPlatform = RssFeedResponse["source"]["platform"];
type RssSourceType = RssFeedResponse["source"]["type"];

export type RssSource = {
	inputUrl: string;
	feedUrl: string;
	platform: RssPlatform;
	type: RssSourceType;
	iconUrl: string;
};

function getPathSegments(url: URL) {
	return url.pathname.split("/").filter(Boolean);
}

function buildSource(
	inputUrl: URL,
	feedPath: string,
	platform: RssPlatform,
	type: RssSourceType,
): RssSource {
	return {
		inputUrl: inputUrl.toString(),
		feedUrl: new URL(feedPath, inputUrl.origin).toString(),
		platform,
		type,
		iconUrl:
			resolveLinkProvider(inputUrl).definition?.faviconUrl ??
			`/api/provider-icons/${platform}.svg`,
	};
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
	return (
		resolveMediumSource(url, segments) ??
		resolveSubstackSource(url, segments) ??
		resolveNoteSource(url, segments) ??
		resolveGhostSource(url, segments) ??
		resolveHashnodeSource(url, segments)
	);
}
