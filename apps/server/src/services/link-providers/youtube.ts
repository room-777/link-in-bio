import type { PageItemLinkMetadata } from "@grabbin/api";
import {
	asNumber,
	asRecord,
	asString,
	fetchJson,
	getHttpsUrl,
	getProviderData,
} from "./runtime";
import type { LinkProviderContext, LinkProviderTarget } from "./types";

function getYoutubeThumbnail(value: unknown) {
	const thumbnails = asRecord(value);
	for (const key of ["maxres", "standard", "high", "medium", "default"]) {
		const url = getHttpsUrl(asRecord(thumbnails?.[key])?.url);
		if (url) return url;
	}
	return undefined;
}

export async function enrichYoutube(
	_url: URL,
	target: LinkProviderTarget,
	context: LinkProviderContext,
): Promise<Partial<PageItemLinkMetadata>> {
	const apiKey = asString(context.env?.YOUTUBE_API_KEY);
	const id = target.params.id;
	if (!apiKey || !id || !["channel", "video"].includes(target.kind)) return {};
	const endpoint = new URL("https://www.googleapis.com/youtube/v3/");
	endpoint.pathname += target.kind === "channel" ? "channels" : "videos";
	endpoint.searchParams.set("part", "snippet,statistics");
	const filter = target.kind === "channel" ? target.params.filter : "id";
	if (!filter) return {};
	endpoint.searchParams.set(filter, id);
	endpoint.searchParams.set("key", apiKey);
	const youtubePayload = asRecord(await fetchJson(endpoint, context));
	const item = asRecord(
		Array.isArray(youtubePayload?.items) ? youtubePayload.items[0] : undefined,
	);
	if (!item) return {};
	const snippet = asRecord(item.snippet);
	const statistics = asRecord(item.statistics);
	const thumbnail = getYoutubeThumbnail(snippet?.thumbnails);
	return {
		title: asString(snippet?.title),
		description: asString(snippet?.description),
		imageUrl: thumbnail,
		providerData: getProviderData({
			subscriberCount:
				target.kind === "channel"
					? asNumber(statistics?.subscriberCount)
					: undefined,
			viewCount: asNumber(statistics?.viewCount),
			likeCount: asNumber(statistics?.likeCount),
			commentCount: asNumber(statistics?.commentCount),
			channelImageUrl: target.kind === "channel" ? thumbnail : undefined,
		}),
	};
}
