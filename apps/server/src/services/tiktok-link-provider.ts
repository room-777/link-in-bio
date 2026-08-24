import type { PageItemLinkMetadata } from "@grabbin/api";
import type { LinkProvider } from "./link-providers";
import {
	fetchSocialProfileHtml,
	parseSocialProfileMetadata,
} from "./social-profile";

const TIKTOK_HOSTNAMES = new Set([
	"tiktok.com",
	"www.tiktok.com",
]);
const TIKTOK_PROFILE_PATH =
	/^\/@[a-z\d._]+\/?$/i;

type TikTokHydration = {
	__DEFAULT_SCOPE__?: {
		"webapp.user-detail"?: {
			userInfo?: {
				user?: {
					nickname?: string;
					uniqueId?: string;
					signature?: string;
					avatarLarger?: string;
				};
				stats?: {
					followerCount?: number;
					followingCount?: number;
					heartCount?: number;
					videoCount?: number;
				};
			};
		};
	};
};

function isTikTokProfile(
	url: URL,
): boolean {
	return (
		TIKTOK_HOSTNAMES.has(
			url.hostname.toLowerCase(),
		) &&
		TIKTOK_PROFILE_PATH.test(
			url.pathname,
		)
	);
}

function getHydrationJson(
	html: string,
): TikTokHydration | undefined {
	const marker =
		"__UNIVERSAL_DATA_FOR_REHYDRATION__";
	const markerIndex =
		html.indexOf(marker);
	if (markerIndex === -1)
		return undefined;
	const start =
		html.indexOf(">", markerIndex) + 1;
	const end = html.indexOf(
		"</script>",
		start,
	);
	if (start <= 0 || end === -1)
		return undefined;
	try {
		return JSON.parse(
			html.slice(start, end),
		) as TikTokHydration;
	} catch {
		return undefined;
	}
}

export function parseTikTokProfileMetadata(
	html: string,
): PageItemLinkMetadata {
	const metadata =
		parseSocialProfileMetadata(html);
	const hydration =
		getHydrationJson(html);
	const user =
		hydration?.__DEFAULT_SCOPE__?.[
			"webapp.user-detail"
		]?.userInfo?.user;
	const stats =
		hydration?.__DEFAULT_SCOPE__?.[
			"webapp.user-detail"
		]?.userInfo?.stats;
	const followerCount =
		stats?.followerCount;
	if (
		typeof followerCount !== "number" ||
		!Number.isFinite(followerCount)
	) {
		return {};
	}
	const imageUrl =
		user?.avatarLarger?.startsWith(
			"https://",
		)
			? user.avatarLarger
			: undefined;
	return {
		...metadata,
		...(metadata.title ||
		!user?.nickname
			? {}
			: {
					title: user.uniqueId
						? `${user.nickname} (@${user.uniqueId})`
						: user.nickname,
				}),
		...(metadata.description ||
		!user?.signature
			? {}
			: {
					description: user.signature,
				}),
		...(metadata.imageUrl || !imageUrl
			? {}
			: { imageUrl }),
		providerData: {
			followerCount,
			followerCountLabel: String(
				followerCount,
			),
			followerCountApproximate: false,
		},
	};
}

export function createTikTokEnricher(
	fallbackEnrich: LinkProvider["enrich"],
): LinkProvider["enrich"] {
	return async (url, context) => {
		if (!isTikTokProfile(url))
			return fallbackEnrich(
				url,
				context,
			);
		const html =
			await fetchSocialProfileHtml(
				new URL(
					`https://tiktok.com${url.pathname}`,
				),
				context,
				{
					readFullDocument: true,
					redirect: "follow",
					userAgent:
						"Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148",
				},
			);
		if (!html)
			return fallbackEnrich(
				url,
				context,
			);
		const metadata =
			parseTikTokProfileMetadata(html);
		return Object.keys(metadata)
			.length > 0
			? metadata
			: fallbackEnrich(url, context);
	};
}
