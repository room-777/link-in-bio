import type { PageItemLinkMetadata } from "@grabbin/api";
import type { LinkProvider } from "./link-providers";
import {
	fetchSocialProfileHtml,
	parseFollowerCountLabel,
	parseSocialProfileMetadata,
} from "./social-profile";

const X_HOSTNAMES = new Set([
	"x.com",
	"www.x.com",
	"twitter.com",
	"www.twitter.com",
]);
const X_PROFILE_PATH =
	/^\/[a-z\d_]+\/?$/i;

function isXProfile(url: URL): boolean {
	return (
		X_HOSTNAMES.has(
			url.hostname.toLowerCase(),
		) &&
		X_PROFILE_PATH.test(url.pathname)
	);
}

export function parseXProfileMetadata(
	html: string,
): PageItemLinkMetadata {
	const metadata =
		parseSocialProfileMetadata(html);
	const descriptionFollowerLabel =
		metadata.description?.match(
			/([\d.,]+\s*[KMB]?)\s+followers\b/i,
		)?.[1];
	const ssrFollowerLabel = html.match(
		/\bfollowers\s*:\s*(\d+)\b/i,
	)?.[1];
	const visibleFollowerLabel =
		html.match(
			/>\s*([\d.,]+\s*[KMB]?)\s*<\/[^>]+>\s*<[^>]+>\s*Followers\s*</i,
		)?.[1];
	const followerLabel =
		descriptionFollowerLabel ??
		ssrFollowerLabel ??
		visibleFollowerLabel;
	const followerData = followerLabel
		? parseFollowerCountLabel(
				followerLabel,
			)
		: undefined;
	return followerData
		? {
				...metadata,
				providerData: followerData,
			}
		: {};
}

export function createXEnricher(
	fallbackEnrich: LinkProvider["enrich"],
): LinkProvider["enrich"] {
	return async (url, context) => {
		if (!isXProfile(url))
			return fallbackEnrich(
				url,
				context,
			);
		const html =
			await fetchSocialProfileHtml(
				new URL(
					`https://x.com${url.pathname.replace(/\/$/, "")}`,
				),
				context,
				{ readFullDocument: true },
			);
		if (!html)
			return fallbackEnrich(
				url,
				context,
			);
		const metadata =
			parseXProfileMetadata(html);
		return Object.keys(metadata)
			.length > 0
			? metadata
			: fallbackEnrich(url, context);
	};
}
