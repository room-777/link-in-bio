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

export async function enrichSoop(
	_url: URL,
	target: LinkProviderTarget,
	context: LinkProviderContext,
): Promise<Partial<PageItemLinkMetadata>> {
	const userId = target.params.userId;
	if (target.kind !== "channel" || !userId) return {};
	const payload = asRecord(
		await fetchJson(
			`https://api-channel.sooplive.com/v1.1/channel/${encodeURIComponent(userId)}/station`,
			context,
		),
	);
	const station = asRecord(payload?.station);
	if (asString(station?.userId)?.toLowerCase() !== userId.toLowerCase())
		return {};
	return {
		title: asString(station?.userNick) ?? asString(station?.stationName),
		imageUrl: getHttpsUrl(station?.profileImage, _url),
		providerData: getProviderData({
			favoriteCount: asNumber(asRecord(payload?.upd)?.fanCnt),
		}),
	};
}
