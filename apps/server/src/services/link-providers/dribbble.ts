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

const reservedProfilePaths = new Set([
	"designers",
	"hire",
	"search",
	"services",
	"shots",
	"tags",
]);

function getPageText(html: string) {
	return decodeHtmlEntities(
		html
			.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, " ")
			.replace(/<[^>]+>/g, " "),
	).replace(/\s+/g, " ");
}

function getCountData(text: string, label: string, key: string) {
	const countLabel = text.match(
		new RegExp(`([\\d.,]+\\s*[KMB]?)\\s+${label}\\b`, "i"),
	)?.[1];
	const parsed = countLabel ? parseCountLabel(countLabel) : undefined;
	return parsed
		? {
				[key]: parsed.followerCount,
				[`${key}Label`]: parsed.followerCountLabel,
				[`${key}Approximate`]: parsed.followerCountApproximate,
			}
		: undefined;
}

function getProfileImageUrl(html: string) {
	for (const match of html.matchAll(/<img\b[^>]*>/gi)) {
		const tag = match[0];
		const classNames = getAttributeValue(tag, "class")?.split(/\s+/) ?? [];
		if (!classNames.includes("profile-avatar")) continue;
		const imageUrl = getHttpsUrl(
			getAttributeValue(tag, "src") ?? getAttributeValue(tag, "data-src"),
		);
		if (imageUrl) return imageUrl;
	}
	return undefined;
}

function getRecentShots(html: string) {
	const thumbnails: string[] = [];
	const seenShots = new Set<string>();
	for (const match of html.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)) {
		const card = match[1] ?? "";
		const shotLink = card.match(/<a\b[^>]*>/i)?.[0];
		const href = getAttributeValue(shotLink ?? "", "href");
		if (!href) continue;
		let shotPath: string;
		try {
			const linkUrl = new URL(href, "https://dribbble.com");
			if (linkUrl.hostname !== "dribbble.com") continue;
			shotPath = linkUrl.pathname;
		} catch {
			continue;
		}
		if (
			!/^\/shots\/\d+(?:-[^/]*)?\/?$/i.test(shotPath) ||
			seenShots.has(shotPath)
		)
			continue;

		const imageUrl = [...card.matchAll(/<img\b[^>]*>/gi)]
			.flatMap((image) => {
				const tag = image[0];
				return [
					getAttributeValue(tag, "data-src"),
					getAttributeValue(tag, "src"),
					getAttributeValue(tag, "data-srcset")?.match(
						/https:\/\/[^\s,]+/,
					)?.[0],
					getAttributeValue(tag, "srcset")?.match(/https:\/\/[^\s,]+/)?.[0],
				].map((value) =>
					getHttpsUrl(value ? decodeHtmlEntities(value) : value),
				);
			})
			.find((url) => Boolean(url));
		if (imageUrl) {
			seenShots.add(shotPath);
			thumbnails.push(imageUrl);
		}
		if (thumbnails.length === 4) break;
	}
	return thumbnails;
}

function getShotCreator(html: string) {
	for (const match of html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)) {
		const attributes = match[1] ?? "";
		const href = getAttributeValue(attributes, "href");
		if (!href) continue;
		let pathname: string;
		try {
			const linkUrl = new URL(href, "https://dribbble.com");
			if (linkUrl.hostname !== "dribbble.com") continue;
			pathname = linkUrl.pathname;
		} catch {
			continue;
		}
		const username = pathname.match(/^\/([a-z\d_-]+)\/?$/i)?.[1];
		if (!username || reservedProfilePaths.has(username.toLowerCase())) continue;

		const content = match[2] ?? "";
		const image = content.match(/<img\b[^>]*>/i)?.[0];
		const name =
			getAttributeValue(image ?? "", "alt") ??
			decodeHtmlEntities(content.replace(/<[^>]+>/g, " "))
				.replace(/\s+/g, " ")
				.trim();
		if (!name) continue;
		return {
			name,
			profileUrl: `https://dribbble.com/${username}`,
		};
	}
	return undefined;
}

export async function enrichDribbble(
	url: URL,
	target: LinkProviderTarget,
	context: LinkProviderContext,
): Promise<Partial<PageItemLinkMetadata>> {
	if (target.kind !== "profile" && target.kind !== "shot") return {};
	const document = await fetchHtml(url, context);
	if (!document)
		return target.kind === "shot" && target.params.slug
			? { title: target.params.slug.replace(/-/g, " ").trim() }
			: {};
	const baseUrl = new URL(document.url);
	const metadata = parseHtmlMetadata(document.html, baseUrl);

	if (target.kind === "profile") {
		const text = getPageText(document.html);
		const recentShotThumbnailUrls = getRecentShots(document.html);
		return {
			...metadata,
			providerData: getProviderData({
				...getCountData(text, "followers", "followerCount"),
				...getCountData(text, "following", "followingCount"),
				...getCountData(text, "likes", "likeCount"),
				profileImageUrl: getProfileImageUrl(document.html),
				recentShotThumbnailUrls:
					recentShotThumbnailUrls.length > 0
						? recentShotThumbnailUrls
						: undefined,
			}),
		};
	}

	const creator = getShotCreator(document.html);
	const creatorDocument = creator
		? await fetchHtml(new URL(creator.profileUrl), context)
		: undefined;
	const title =
		metadata.title
			?.replace(/\s+by\s+.+?(?:\s+for\s+.+?)?\s+on Dribbble$/i, "")
			.trim() || target.params.slug?.replace(/-/g, " ").trim();
	// ponytail: Slug titles survive WAF challenges; author details need the shot page HTML.
	return {
		...metadata,
		...(title ? { title } : {}),
		providerData: getProviderData({
			authorName: creator?.name,
			authorProfileUrl: creator?.profileUrl,
			authorProfileImageUrl: creatorDocument
				? getProfileImageUrl(creatorDocument.html)
				: undefined,
		}),
	};
}
