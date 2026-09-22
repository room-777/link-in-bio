import type { PageItemLinkMetadata } from "@grabbin/api";
import { fetchHtml, parseCountLabel, parseHtmlMetadata } from "./runtime";
import type { LinkProviderContext, LinkProviderTarget } from "./types";

export async function enrichInstagram(
	_url: URL,
	target: LinkProviderTarget,
	context: LinkProviderContext,
): Promise<Partial<PageItemLinkMetadata>> {
	const handle = target.kind === "profile" ? target.params.handle : undefined;
	if (!handle) return {};
	const document = await fetchHtml(
		new URL(`https://www.instagram.com/${handle}`),
		context,
	);
	if (!document) return {};
	const metadata = parseHtmlMetadata(document.html, new URL(document.url));
	const followerLabel = metadata.description?.match(
		/([\d.,]+\s*[KMB]?)\s+followers\b/i,
	)?.[1];
	const followerData = followerLabel
		? parseCountLabel(followerLabel)
		: undefined;
	return {
		...metadata,
		...(followerData ? { providerData: followerData } : {}),
	};
}
