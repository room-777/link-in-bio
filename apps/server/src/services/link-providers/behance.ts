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
	const urls: string[] = [];
	for (const match of html.matchAll(/href=["'](\/gallery\/\d+[^"']*)["']/gi)) {
		const index = match.index ?? 0;
		const start = Math.max(0, index - 2500);
		const card = html.slice(start, index + 2500);
		const image = [
			...card.matchAll(/https:\/\/mir-s3-cdn-cf\.behance\.net\/[^\s"']+/gi),
		].sort(
			(a, b) =>
				Math.abs((a.index ?? 0) - (index - start)) -
				Math.abs((b.index ?? 0) - (index - start)),
		)[0]?.[0];
		const url = getHttpsUrl(image);
		if (url && !urls.includes(url)) urls.push(url);
		if (urls.length === 4) break;
	}
	return urls;
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

function getProjectAuthorData(html: string) {
	const profileImage = [...html.matchAll(/<img\b[^>]*>/gi)]
		.map((match) => match[0])
		.find((tag) =>
			decodeHtmlEntities(getAttributeValue(tag, "alt") ?? "").match(
				/(?:'s profile|designer's profile)$/i,
			),
		);
	if (!profileImage) return undefined;

	const alt = decodeHtmlEntities(getAttributeValue(profileImage, "alt") ?? "");
	const authorName = alt
		.replace(/\s*\|.*$/, "")
		.replace(/(?:'s profile|designer's profile)$/i, "")
		.trim();
	const authorProfileImageUrl = getHttpsUrl(
		getAttributeValue(profileImage, "srcset")?.match(
			/https:\/\/[^\s,]+/,
		)?.[0] ?? getAttributeValue(profileImage, "src"),
	);
	return getProviderData({
		authorName: authorName || undefined,
		authorProfileImageUrl,
	});
}

export async function enrichBehance(
	url: URL,
	target: LinkProviderTarget,
	context: LinkProviderContext,
): Promise<Partial<PageItemLinkMetadata>> {
	if (target.kind !== "profile" && target.kind !== "project") return {};
	const encodedSlug = url.pathname.split("/").filter(Boolean).at(-1) ?? "";
	let slugTitle = encodedSlug;
	try {
		slugTitle = decodeURIComponent(encodedSlug);
	} catch {
		// Keep the URL's readable text if its percent escapes are invalid.
	}
	slugTitle = slugTitle.replace(/[-_]+/g, " ").trim();
	const fallbackTitle =
		target.kind === "profile" ? target.params.username : slugTitle;
	const pageUrl =
		target.kind === "project"
			? new URL(
					`/embed/project/${target.params.id}?ilo0=1`,
					"https://www.behance.net",
				)
			: url;
	const document = await fetchHtml(pageUrl, context, { timeoutMs: 8_000 });
	if (!document) return fallbackTitle ? { title: fallbackTitle } : {};
	const metadata = parseHtmlMetadata(document.html, new URL(document.url));
	if (target.kind === "project") {
		const authorData = getProjectAuthorData(document.html);
		const title = metadata.title?.replace(/\s+:: Behance$/i, "");
		return {
			...metadata,
			title: title === "behance.net" ? fallbackTitle : title,
			description: metadata.description?.startsWith(
				"Behance is the world's largest creative network",
			)
				? undefined
				: metadata.description,
			imageUrl: getProjectCoverUrl(document.html) ?? metadata.imageUrl,
			...(authorData ? { providerData: authorData } : {}),
		};
	}

	const text = decodeHtmlEntities(
		document.html
			.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, " ")
			.replace(/<[^>]+>/g, " "),
	);
	const followerLabel =
		document.html.match(
			/aria-label=["']Followers\s*-\s*([\d,]+)\s+users/i,
		)?.[1] ?? text.match(/([\d.,]+\s*[KMB]?)\s+followers\b/i)?.[1];
	const followerData = followerLabel
		? parseCountLabel(followerLabel)
		: undefined;
	const recentProjectThumbnailUrls = getRecentProjectThumbnailUrls(
		document.html,
	);
	return {
		...metadata,
		title: metadata.title === "behance.net" ? fallbackTitle : metadata.title,
		providerData: getProviderData({
			...followerData,
			recentProjectThumbnailUrls:
				recentProjectThumbnailUrls.length > 0
					? recentProjectThumbnailUrls
					: undefined,
		}),
	};
}
