import type { PageItemLinkMetadata } from "@grabbin/api";
import {
	asNumber,
	asRecord,
	asString,
	fetchJson,
	getHttpsUrl,
	getProviderData,
	isRecord,
} from "./runtime";
import type { LinkProviderContext, LinkProviderTarget } from "./types";

async function fetchChzzk(
	path: string,
	context: LinkProviderContext,
	parameters: Record<string, string>,
) {
	const clientId = asString(context.env?.CHZZK_CLIENT_ID);
	const clientSecret = asString(context.env?.CHZZK_CLIENT_SECRET);
	if (!clientId || !clientSecret) return undefined;
	const endpoint = new URL(`https://openapi.chzzk.naver.com/open/v1/${path}`);
	for (const [key, value] of Object.entries(parameters))
		endpoint.searchParams.set(key, value);
	return asRecord(
		await fetchJson(endpoint, context, {
			headers: {
				Accept: "application/json",
				"Client-Id": clientId,
				"Client-Secret": clientSecret,
			},
		}),
	);
}

function getChzzkItems(payload: Record<string, unknown> | undefined) {
	for (const value of [payload?.content, payload?.data]) {
		if (Array.isArray(value)) return value.filter(isRecord);
		const record = asRecord(value);
		for (const nested of [record?.data, record?.content]) {
			if (Array.isArray(nested)) return nested.filter(isRecord);
		}
	}
	return [];
}

export async function enrichChzzk(
	url: URL,
	target: LinkProviderTarget,
	context: LinkProviderContext,
): Promise<Partial<PageItemLinkMetadata>> {
	const channelId = target.params.channelId;
	if (!channelId) return {};
	if (target.kind === "channel") {
		const channel = getChzzkItems(
			await fetchChzzk("channels", context, { channelIds: channelId }),
		)[0];
		if (!channel) return {};
		const channelImageUrl = getHttpsUrl(channel.channelImageUrl, url);
		return {
			title: asString(channel.channelName),
			imageUrl: channelImageUrl,
			providerData: getProviderData({
				channelId: asString(channel.channelId) ?? channelId,
				followerCount: asNumber(channel.followerCount),
				verifiedMark:
					typeof channel.verifiedMark === "boolean"
						? channel.verifiedMark
						: undefined,
				channelImageUrl,
			}),
		};
	}
	if (target.kind !== "live") return {};
	const live = getChzzkItems(
		await fetchChzzk("lives", context, { size: "20" }),
	).find((item) => asString(item.channelId) === channelId);
	if (!live) {
		const channel = getChzzkItems(
			await fetchChzzk("channels", context, { channelIds: channelId }),
		)[0];
		if (!channel) return {};
		const channelImageUrl = getHttpsUrl(channel.channelImageUrl, url);
		return {
			title: asString(channel.channelName),
			description: asString(channel.channelDescription),
			imageUrl: channelImageUrl,
			providerData: getProviderData({
				channelId: asString(channel.channelId) ?? channelId,
				followerCount: asNumber(channel.followerCount),
				verifiedMark:
					typeof channel.verifiedMark === "boolean"
						? channel.verifiedMark
						: undefined,
				isLive: false,
				channelImageUrl,
			}),
		};
	}
	const liveThumbnailUrl = getHttpsUrl(live.liveThumbnailImageUrl, url);
	return {
		title: asString(live.liveTitle) ?? asString(live.channelName),
		description: asString(live.liveCategoryValue),
		imageUrl: liveThumbnailUrl,
		providerData: getProviderData({
			channelId,
			followerCount: asNumber(live.followerCount),
			isLive: true,
			liveId: asString(live.liveId),
			liveViewerCount: asNumber(live.concurrentUserCount),
			liveThumbnailUrl,
		}),
	};
}
