import type { PageItemLinkMetadata } from "@grabbin/api";
import type { LinkProvider } from "./link-providers";
import {
	fetchSocialProfileHtml,
	parseFollowerCountLabel,
	parseSocialProfileMetadata,
} from "./social-profile";

const INSTAGRAM_HOSTNAMES = new Set([
	"instagram.com",
	"www.instagram.com",
]);
const INSTAGRAM_PROFILE_PATH =
	/^\/[a-z\d._]+\/?$/i;

function isInstagramProfile(
	url: URL,
): boolean {
	return (
		INSTAGRAM_HOSTNAMES.has(
			url.hostname.toLowerCase(),
		) &&
		INSTAGRAM_PROFILE_PATH.test(
			url.pathname,
		)
	);
}

export function parseInstagramProfileMetadata(
	html: string,
): PageItemLinkMetadata {
	const metadata =
		parseSocialProfileMetadata(html);
	const followerLabel =
		metadata.description?.match(
			/([\d.,]+\s*[KMB]?)\s+Followers\b/i,
		)?.[1];
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

export function createInstagramEnricher(
	fallbackEnrich: LinkProvider["enrich"],
): LinkProvider["enrich"] {
	return async (url, context) => {
		if (!isInstagramProfile(url))
			return fallbackEnrich(
				url,
				context,
			);
		const html =
			await fetchSocialProfileHtml(
				new URL(
					`https://www.instagram.com${url.pathname}`,
				),
				context,
			);
		if (!html)
			return fallbackEnrich(
				url,
				context,
			);
		const metadata =
			parseInstagramProfileMetadata(
				html,
			);
		return Object.keys(metadata)
			.length > 0
			? metadata
			: fallbackEnrich(url, context);
	};
}
