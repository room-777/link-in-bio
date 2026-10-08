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

function getRecentProjectThumbnailUrls(html: string) {
	return [...html.matchAll(/<article\b[^>]*>([\s\S]*?)<\/article>/gi)]
		.map((match) => {
			const article = match[1] ?? "";
			if (!/href=["']\/gallery\/\d+(?:\/|["'])/i.test(article))
				return undefined;
			const srcset = article.match(
				/<source\b[^>]*\bsrcset=["']([^"']+)["']/i,
			)?.[1];
			return getHttpsUrl(srcset?.match(/https:\/\/[^\s,]+/)?.[0]);
		})
		.filter((url): url is string => Boolean(url))
		.slice(0, 4);
}

function getProjectCoverUrl(html: string) {
	const cover = [...html.matchAll(/<img\b[^>]*>/gi)]
		.map((match) => match[0])
		.find((tag) => getAttributeValue(tag, "alt")?.startsWith("Project Cover:"));
	const srcset = cover ? getAttributeValue(cover, "srcset") : undefined;
	const candidates = [
		...(srcset ?? "").matchAll(/(https:\/\/[^\s,]+)\s+(\d+)w/g),
	];
	const largest = candidates.sort(
		(a, b) => Number(b[2]) - Number(a[2]),
	)[0]?.[1];
	return getHttpsUrl(largest);
}

export async function enrichBehance(
	url: URL,
	target: LinkProviderTarget,
	context: LinkProviderContext,
): Promise<Partial<PageItemLinkMetadata>> {
	if (target.kind !== "profile" && target.kind !== "project") return {};
	const pageUrl =
		target.kind === "project"
			? new URL(
					`/embed/project/${target.params.id}?ilo0=1`,
					"https://www.behance.net",
				)
			: url;
	const document = await fetchHtml(pageUrl, context);
	if (!document) return {};
	const metadata = parseHtmlMetadata(document.html, new URL(document.url));
	if (target.kind === "project") {
		return {
			...metadata,
			title: metadata.title?.replace(/\s+:: Behance$/i, ""),
			description: metadata.description?.startsWith(
				"Behance is the world's largest creative network",
			)
				? undefined
				: metadata.description,
			imageUrl: getProjectCoverUrl(document.html) ?? metadata.imageUrl,
		};
	}

	const text = decodeHtmlEntities(
		document.html
			.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, " ")
			.replace(/<[^>]+>/g, " "),
	);
	const followerLabel = text.match(/([\d.,]+\s*[KMB]?)\s+followers\b/i)?.[1];
	const followerData = followerLabel
		? parseCountLabel(followerLabel)
		: undefined;
	const recentProjectThumbnailUrls = getRecentProjectThumbnailUrls(
		document.html,
	);
	return {
		...metadata,
		providerData: getProviderData({
			...followerData,
			recentProjectThumbnailUrls:
				recentProjectThumbnailUrls.length > 0
					? recentProjectThumbnailUrls
					: undefined,
		}),
	};
}
