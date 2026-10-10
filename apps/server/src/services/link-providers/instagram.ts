import type { PageItemLinkMetadata } from "@grabbin/api";
import {
	asNumber,
	asRecord,
	asString,
	fetchJson,
	getHttpsUrl,
	getInstagramPrivateHeaders,
	getProviderData,
	parseCountLabel,
} from "./runtime";
import type { LinkProviderContext, LinkProviderTarget } from "./types";

function getInstagramCounts(user: unknown, handle: string) {
	const profile = asRecord(user);
	if (
		asString(profile?.username)?.replace(/^@/, "").toLowerCase() !==
		handle.toLowerCase()
	)
		return {};
	const count = (value: unknown) => {
		const number = asNumber(value);
		return number !== undefined && Number.isSafeInteger(number) && number >= 0
			? number
			: undefined;
	};
	const followerCount = count(
		asRecord(profile?.edge_followed_by)?.count ?? profile?.follower_count,
	);
	return {
		followerCount,
		followerCountApproximate: followerCount === undefined ? undefined : false,
		followingCount: count(
			asRecord(profile?.edge_follow)?.count ?? profile?.following_count,
		),
		mediaCount: count(
			asRecord(profile?.edge_owner_to_timeline_media)?.count ??
				profile?.media_count,
		),
	};
}

function getInstagramRecentPostThumbnailUrls(user: unknown) {
	const media = asRecord(asRecord(user)?.edge_owner_to_timeline_media);
	const edges = Array.isArray(media?.edges) ? media.edges : [];
	const urls: string[] = [];
	for (const edge of edges) {
		const node = asRecord(asRecord(edge)?.node);
		const resources = Array.isArray(node?.thumbnail_resources)
			? node.thumbnail_resources
			: [];
		const largestResource = resources
			.map(asRecord)
			.filter(
				(resource) => resource && asNumber(resource.config_width) !== undefined,
			)
			.sort(
				(a, b) =>
					(asNumber(b?.config_width) ?? 0) - (asNumber(a?.config_width) ?? 0),
			)[0];
		const imageUrl = getHttpsUrl(
			node?.thumbnail_src ?? node?.display_url ?? largestResource?.src,
		);
		if (imageUrl && !urls.includes(imageUrl)) urls.push(imageUrl);
		if (urls.length === 4) break;
	}
	return urls;
}

function getInstagramFeedThumbnailUrls(payload: unknown) {
	const items = asRecord(payload)?.items;
	if (!Array.isArray(items)) return [];
	const urls: string[] = [];
	for (const item of items) {
		const media = asRecord(item);
		const carousel = Array.isArray(media?.carousel_media)
			? media.carousel_media
			: [];
		for (const source of [media, ...carousel]) {
			const candidates = asRecord(
				asRecord(source)?.image_versions2,
			)?.candidates;
			const largestCandidate = Array.isArray(candidates)
				? candidates
						.map(asRecord)
						.filter((candidate) => asNumber(candidate?.width) !== undefined)
						.sort(
							(a, b) => (asNumber(b?.width) ?? 0) - (asNumber(a?.width) ?? 0),
						)[0]
				: undefined;
			const imageUrl = getHttpsUrl(
				largestCandidate?.url ?? asRecord(source)?.thumbnail_url,
			);
			if (imageUrl && !urls.includes(imageUrl)) urls.push(imageUrl);
			if (urls.length === 4) return urls;
		}
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
	const headers = getInstagramPrivateHeaders(context.env?.INSTAGRAM_SESSION_ID);
	if (!headers) return {};
	const profileUrl = new URL(
		`/api/v1/users/web_profile_info/?username=${encodeURIComponent(handle)}`,
		"https://i.instagram.com",
	);
	const profileResponse = await fetchJson(
		profileUrl,
		{ ...context, fetch: context.fetchOptional ?? context.fetch },
		{ headers },
	);
	const profile = asRecord(asRecord(profileResponse)?.data)?.user;
	const profileData = asRecord(profile);
	const profileMatchesHandle =
		asString(profileData?.username)?.replace(/^@/, "").toLowerCase() ===
		handle.toLowerCase();
	if (!profileMatchesHandle) return {};
	const profileImageUrl = getHttpsUrl(
		profileData?.profile_pic_url_hd ?? profileData?.profile_pic_url,
		new URL("https://www.instagram.com"),
	);
	const metadata = {
		...(asString(profileData?.full_name)
			? { title: asString(profileData?.full_name) }
			: { title: `@${handle}` }),
		...(asString(profileData?.biography)
			? { description: asString(profileData?.biography) }
			: {}),
		...(profileImageUrl ? { imageUrl: profileImageUrl } : {}),
	};
	let recentPostThumbnailUrls =
		getInstagramRecentPostThumbnailUrls(profileData);
	const userId = asString(profileData?.id ?? profileData?.pk);
	if (recentPostThumbnailUrls.length === 0 && userId) {
		const feedUrl = new URL(
			`/api/v1/feed/user/${encodeURIComponent(userId)}/`,
			"https://i.instagram.com",
		);
		feedUrl.searchParams.set("count", "12");
		feedUrl.searchParams.set("max_id", "");
		feedUrl.searchParams.set(
			"rank_token",
			`${userId}_8aa373c6-f316-44d7-b49e-d74563f4a8f3`,
		);
		feedUrl.searchParams.set("ranked_content", "true");
		const feedResponse = await fetchJson(
			feedUrl,
			{ ...context, fetch: context.fetchOptional ?? context.fetch },
			{ headers },
		);
		recentPostThumbnailUrls = getInstagramFeedThumbnailUrls(feedResponse);
	}
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
			...getInstagramCounts(
				asRecord(asRecord(profileResponse)?.data)?.user,
				handle,
			),
			recentPostThumbnailUrls:
				recentPostThumbnailUrls.length > 0
					? recentPostThumbnailUrls
					: undefined,
		}),
	};
}
