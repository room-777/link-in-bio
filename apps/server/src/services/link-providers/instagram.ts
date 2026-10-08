import type { PageItemLinkMetadata } from "@grabbin/api";
import {
	decodeHtmlEntities,
	fetchHtml,
	getAttributeValue,
	getHttpsUrl,
	getProviderData,
	parseCountLabel,
	parseHtmlMetadata,
} from "./runtime";
import type { LinkProviderContext, LinkProviderTarget } from "./types";

function getRecentPostThumbnailUrls(html: string, handle: string) {
	const urls: string[] = [];
	const seenPosts = new Set<string>();
	for (const match of html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)) {
		const href = getAttributeValue(match[1] ?? "", "href");
		if (!href) continue;
		let pathname: string;
		try {
			const postUrl = new URL(href, "https://www.instagram.com");
			if (
				postUrl.hostname !== "www.instagram.com" &&
				postUrl.hostname !== "instagram.com"
			)
				continue;
			pathname = postUrl.pathname;
		} catch {
			continue;
		}
		const [postHandle, postType, postPath] = pathname
			.split("/")
			.filter(Boolean);
		if (
			postHandle?.toLowerCase() !== handle.toLowerCase() ||
			postType !== "p" ||
			!postPath
		)
			continue;
		if (seenPosts.has(postPath)) continue;

		const image = match[2]?.match(/<img\b[^>]*>/i)?.[0];
		if (!image) continue;
		const imageUrl = getHttpsUrl(
			decodeHtmlEntities(
				getAttributeValue(image, "data-src") ??
					getAttributeValue(image, "src") ??
					getAttributeValue(image, "srcset")?.match(/https:\/\/[^\s,]+/)?.[0] ??
					"",
			),
		);
		if (!imageUrl) continue;
		seenPosts.add(postPath);
		urls.push(imageUrl);
		if (urls.length === 4) break;
	}
	return urls;
}

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
	const recentPostThumbnailUrls = getRecentPostThumbnailUrls(
		document.html,
		handle,
	);
	const followerLabel = metadata.description?.match(
		/([\d.,]+\s*[KMB]?)\s+followers\b/i,
	)?.[1];
	const followerData = followerLabel
		? parseCountLabel(followerLabel)
		: undefined;
	return {
		...metadata,
		imageUrl: recentPostThumbnailUrls[0] ?? metadata.imageUrl,
		providerData: getProviderData({
			...followerData,
			recentPostThumbnailUrls:
				recentPostThumbnailUrls.length > 0
					? recentPostThumbnailUrls
					: undefined,
		}),
	};
}
