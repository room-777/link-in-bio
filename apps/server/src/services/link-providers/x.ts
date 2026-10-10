import type { PageItemLinkMetadata } from "@grabbin/api";
import { fetchHtml, parseCountLabel, parseHtmlMetadata } from "./runtime";
import type { LinkProviderContext, LinkProviderTarget } from "./types";

export async function enrichX(
	url: URL,
	target: LinkProviderTarget,
	context: LinkProviderContext,
): Promise<Partial<PageItemLinkMetadata>> {
	const handle = target.kind === "profile" ? target.params.handle : undefined;
	if (!handle) return {};
	const document = await fetchHtml(url, context);
	if (!document) return {};
	const metadata = parseHtmlMetadata(document.html, new URL(document.url));
	const descriptionFollowerLabel = metadata.description?.match(
		/([\d.,]+\s*[KMB]?)\s+followers\b/i,
	)?.[1];
	const rawFollowerCount = document.html.match(
		/(?:^|[^\w])["']?followers(?:_count|Count)?["']?\s*:\s*(\d+)/i,
	)?.[1];
	const followerData = descriptionFollowerLabel
		? parseCountLabel(descriptionFollowerLabel)
		: rawFollowerCount
			? parseCountLabel(rawFollowerCount)
			: undefined;
	return {
		...metadata,
		...(followerData ? { providerData: followerData } : {}),
	};
}
