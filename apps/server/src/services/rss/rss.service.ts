import type { RssFeedResponse } from "@grabbin/api";
import { parseRssFeed } from "./rss-parser";
import { resolveRssSource } from "./rss-source";

const RSS_FETCH_TIMEOUT_MS = 3_000;
const MAX_RSS_BYTES = 1_000_000;

export type RssServiceErrorCode =
	| "UNSUPPORTED_RSS_URL"
	| "RSS_FEED_UNAVAILABLE"
	| "INVALID_RSS_FEED";

export class RssServiceError extends Error {
	constructor(public readonly code: RssServiceErrorCode) {
		super(code);
	}
}

async function readLimitedBody(response: Response) {
	const contentLength = Number(response.headers.get("content-length"));
	if (Number.isFinite(contentLength) && contentLength > MAX_RSS_BYTES)
		return undefined;
	if (!response.body) return "";

	const reader = response.body.getReader();
	const decoder = new TextDecoder();
	let totalBytes = 0;
	let xml = "";
	try {
		for (;;) {
			const { done, value } = await reader.read();
			if (done) break;
			if (!value) continue;
			totalBytes += value.byteLength;
			if (totalBytes > MAX_RSS_BYTES) {
				await reader.cancel();
				return undefined;
			}
			xml += decoder.decode(value, { stream: true });
		}
		return xml + decoder.decode();
	} finally {
		reader.releaseLock();
	}
}

export async function fetchRssFeed({
	url,
	fetch: fetchFn,
}: {
	url: string;
	fetch: typeof fetch;
}): Promise<RssFeedResponse> {
	const source = resolveRssSource(url);
	if (!source) throw new RssServiceError("UNSUPPORTED_RSS_URL");

	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), RSS_FETCH_TIMEOUT_MS);
	try {
		const response = await fetchFn(source.feedUrl, {
			redirect: "follow",
			signal: controller.signal,
			headers: {
				Accept: "application/rss+xml,application/xml,text/xml",
				"User-Agent": "Grabbin RSS Reader/1.0",
			},
		});
		if (!response.ok) throw new RssServiceError("RSS_FEED_UNAVAILABLE");
		const xml = await readLimitedBody(response);
		if (!xml) throw new RssServiceError("INVALID_RSS_FEED");
		const feed = await parseRssFeed(xml, source);
		if (!feed) throw new RssServiceError("INVALID_RSS_FEED");
		return feed;
	} catch (error) {
		if (error instanceof RssServiceError) throw error;
		throw new RssServiceError("RSS_FEED_UNAVAILABLE");
	} finally {
		clearTimeout(timeout);
	}
}
