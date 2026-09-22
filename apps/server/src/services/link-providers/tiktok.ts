import type { PageItemLinkMetadata } from "@grabbin/api";
import {
	asNumber,
	asRecord,
	asString,
	fetchHtml,
	getHttpsUrl,
	getScriptJson,
	parseHtmlMetadata,
} from "./runtime";
import type { LinkProviderContext, LinkProviderTarget } from "./types";

export async function enrichTikTok(
	_url: URL,
	target: LinkProviderTarget,
	context: LinkProviderContext,
): Promise<Partial<PageItemLinkMetadata>> {
	const handle = target.kind === "profile" ? target.params.handle : undefined;
	if (!handle) return {};
	const document = await fetchHtml(
		new URL(`https://www.tiktok.com/@${handle}`),
		context,
		{
			userAgent:
				"Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148",
		},
	);
	if (!document) return {};
	const metadata = parseHtmlMetadata(document.html, new URL(document.url));
	const hydration = getScriptJson(
		document.html,
		"__UNIVERSAL_DATA_FOR_REHYDRATION__",
	);
	const hydrationRecord = asRecord(hydration);
	const scope = asRecord(hydrationRecord?.__DEFAULT_SCOPE__);
	const detail = asRecord(scope?.["webapp.user-detail"]);
	const userInfo = asRecord(detail?.userInfo);
	const user = asRecord(userInfo?.user);
	const stats = asRecord(userInfo?.stats);
	const followerCount =
		asNumber(stats?.followerCount) ??
		asNumber(document.html.match(/"followerCount"\s*:\s*(\d+)/i)?.[1]);
	if (followerCount === undefined) return metadata;
	const title = metadata.title ?? asString(user?.nickname);
	const description = metadata.description ?? asString(user?.signature);
	const imageUrl =
		metadata.imageUrl ?? getHttpsUrl(user?.avatarLarger, new URL(document.url));
	return {
		...(title ? { title } : {}),
		...(description ? { description } : {}),
		...(imageUrl ? { imageUrl } : {}),
		providerData: {
			followerCount,
			followerCountLabel: String(followerCount),
			followerCountApproximate: false,
		},
	};
}
