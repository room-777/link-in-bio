import type { PageItemLinkMetadata } from "@grabbin/api";
import { resolveLinkProvider } from "@grabbin/page-link";
import {
	decodeHtmlEntities,
	fetchHtml,
	getAttributeValue,
	getHttpsUrl,
	getProviderData,
	parseHtmlMetadata,
} from "./runtime";
import type { LinkProviderContext, LinkProviderTarget } from "./types";

function getText(html: string) {
	return decodeHtmlEntities(
		html
			.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, " ")
			.replace(/<[^>]+>/g, " "),
	).replace(/\s+/g, " ");
}

function getHeading(html: string) {
	const heading = html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1];
	return heading ? getText(heading).trim() || undefined : undefined;
}

function getImageUrl(tag: string, baseUrl: URL) {
	return getHttpsUrl(
		getAttributeValue(tag, "src") ??
			getAttributeValue(tag, "data-src") ??
			getAttributeValue(tag, "srcset")?.match(/https:\/\/[^\s,]+/)?.[0],
		baseUrl,
	);
}

function getImages(
	html: string,
	baseUrl: URL,
	excluded: readonly (string | undefined)[] = [],
) {
	const pinImages = [...html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)]
		.filter((match) => {
			const href = getAttributeValue(match[1] ?? "", "href");
			if (!href) return false;
			try {
				return /^\/pin\/\d+/i.test(new URL(href, baseUrl).pathname);
			} catch {
				return false;
			}
		})
		.flatMap((match) =>
			[...(match[2] ?? "").matchAll(/<img\b[^>]*>/gi)].map((image) => image[0]),
		);
	const tags =
		pinImages.length > 0
			? pinImages
			: [...html.matchAll(/<img\b[^>]*>/gi)]
					.map((match) => match[0])
					.filter((tag) => getImageUrl(tag, baseUrl)?.includes("i.pinimg.com"));
	const images: string[] = [];
	for (const tag of tags) {
		const imageUrl = getImageUrl(tag, baseUrl);
		if (imageUrl && !excluded.includes(imageUrl) && !images.includes(imageUrl))
			images.push(imageUrl);
		if (images.length === 4) break;
	}
	return images;
}

function getProfileImage(
	html: string,
	baseUrl: URL,
	fallback?: string,
	name?: string,
) {
	const image = [...html.matchAll(/<img\b[^>]*>/gi)]
		.map((match) => match[0])
		.find((tag) => {
			const alt = getAttributeValue(tag, "alt")?.trim();
			return (
				Boolean(alt && name && alt.toLowerCase() === name.toLowerCase()) ||
				/\b(profile|avatar)\b/i.test(alt ?? "")
			);
		});
	return (image ? getImageUrl(image, baseUrl) : undefined) ?? fallback;
}

function getAuthor(html: string, baseUrl: URL) {
	const reservedHandles = new Set([
		"about",
		"business",
		"categories",
		"explore",
		"ideas",
		"login",
		"pin",
		"search",
		"settings",
		"signup",
		"today",
	]);
	for (const match of html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)) {
		const href = getAttributeValue(match[1] ?? "", "href");
		if (!href) continue;
		let authorUrl: URL;
		try {
			authorUrl = new URL(href, baseUrl);
		} catch {
			continue;
		}
		if (
			(authorUrl.hostname !== "pinterest.com" &&
				!authorUrl.hostname.endsWith(".pinterest.com")) ||
			!/^\/[a-z\d_-]+\/?$/i.test(authorUrl.pathname) ||
			reservedHandles.has(authorUrl.pathname.replaceAll("/", "").toLowerCase())
		)
			continue;
		const image = match[2]?.match(/<img\b[^>]*>/i)?.[0];
		const name =
			(image ? getAttributeValue(image, "alt") : undefined) ??
			getText(match[2] ?? "").trim();
		if (!name) continue;
		return {
			name: name.replace(/\s+(?:profile|avatar)$/i, "").trim(),
			profileUrl: authorUrl.toString(),
			imageUrl: image ? getImageUrl(image, baseUrl) : undefined,
		};
	}
	return undefined;
}

async function getAuthorWithImage(
	author: ReturnType<typeof getAuthor>,
	context: LinkProviderContext,
) {
	if (!author) return author;
	const document = await fetchHtml(new URL(author.profileUrl), context);
	if (!document) return author;
	const profileUrl = new URL(document.url);
	const metadata = parseHtmlMetadata(document.html, profileUrl);
	const profileName =
		getHeading(document.html) ??
		metadata.title
			?.replace(/\s*[|·]\s*Pinterest$/i, "")
			.replace(/\s*-\s*(?:프로필|profile)$/i, "")
			.replace(/\s*\([^)]*\)$/, "")
			.trim();
	return {
		...author,
		name: profileName || author.name,
		imageUrl:
			getProfileImage(
				document.html,
				profileUrl,
				metadata.imageUrl,
				profileName,
			) ?? author.imageUrl,
	};
}

function getFollowerCount(html: string) {
	const text = getText(html);
	const english = text.match(/([\d,.]+)\s*([KMB])?\s+followers?\b/i);
	const korean = text.match(/팔로워\s*([\d,.]+)\s*(천|만|억)?/i);
	const match = english ?? korean;
	if (!match?.[1]) return undefined;
	const number = Number(match[1].replace(/,/g, ""));
	if (!Number.isFinite(number)) return undefined;
	const suffix = match[2]?.toUpperCase();
	const multiplier =
		match[2] === "만"
			? 10_000
			: match[2] === "억"
				? 100_000_000
				: suffix === "K" || match[2] === "천"
					? 1_000
					: suffix === "M"
						? 1_000_000
						: suffix === "B"
							? 1_000_000_000
							: 1;
	return {
		followerCount: number * multiplier,
		followerCountApproximate: Boolean(match[2]),
	};
}

async function enrichPage(
	url: URL,
	target: LinkProviderTarget,
	html: string,
	context: LinkProviderContext,
): Promise<Partial<PageItemLinkMetadata>> {
	const baseUrl = url;
	const metadata = parseHtmlMetadata(html, baseUrl);
	const title =
		getHeading(html) ?? metadata.title?.replace(/\s*[|·]\s*Pinterest$/i, "");
	if (target.kind === "profile") {
		const profileImageUrl = getProfileImage(html, baseUrl, metadata.imageUrl);
		return {
			...(title ? { title } : {}),
			...(profileImageUrl ? { imageUrl: profileImageUrl } : {}),
			providerData: getProviderData({
				...getFollowerCount(html),
				profileImageUrl,
			}),
		};
	}
	if (target.kind === "board") {
		const username = target.params.username;
		const owner = await getAuthorWithImage(
			username
				? {
						name: username,
						profileUrl: new URL(`/${username}/`, baseUrl).toString(),
						imageUrl: undefined,
					}
				: getAuthor(html, baseUrl),
			context,
		);
		const recentBoardThumbnailUrls = getImages(html, baseUrl, [
			metadata.imageUrl,
			owner?.imageUrl,
		]);
		return {
			...(title ? { title } : {}),
			imageUrl: metadata.imageUrl ?? recentBoardThumbnailUrls[0],
			providerData: getProviderData({
				authorName: owner?.name,
				authorProfileImageUrl: owner?.imageUrl,
				ownerName: owner?.name,
				ownerProfileImageUrl: owner?.imageUrl,
				recentBoardThumbnailUrls:
					recentBoardThumbnailUrls.length > 0
						? recentBoardThumbnailUrls
						: undefined,
			}),
		};
	}
	if (target.kind === "pin") {
		const author = await getAuthorWithImage(getAuthor(html, baseUrl), context);
		return {
			...(title ? { title } : {}),
			...(metadata.imageUrl ? { imageUrl: metadata.imageUrl } : {}),
			providerData: getProviderData({
				authorName: author?.name,
				authorProfileImageUrl: author?.imageUrl,
			}),
		};
	}
	return {};
}

export async function enrichPinterest(
	url: URL,
	target: LinkProviderTarget,
	context: LinkProviderContext,
): Promise<Partial<PageItemLinkMetadata>> {
	const document = await fetchHtml(url, context);
	if (!document) return {};
	if (target.kind !== "short-link")
		return enrichPage(new URL(document.url), target, document.html, context);

	const finalUrl = new URL(document.url);
	const resolved = resolveLinkProvider(finalUrl);
	if (
		resolved.id !== "pinterest" ||
		!resolved.target ||
		resolved.target.kind === "short-link"
	)
		return {};
	return enrichPage(finalUrl, resolved.target, document.html, context);
}
