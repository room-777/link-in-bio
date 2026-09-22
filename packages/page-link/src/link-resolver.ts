import type { PageItemLinkPresentation } from "@grabbin/api";
import {
	providerByHostname,
	providerCountKeys,
	providerLabels,
	providerTheme,
} from "./provider-data";

const compactNumberFormatter = new Intl.NumberFormat("en-US", {
	notation: "compact",
	maximumFractionDigits: 1,
});

function getHostname(url: string) {
	try {
		return new URL(url).hostname.replace(/^www\./, "");
	} catch {
		return url;
	}
}

function getProvider(url: string) {
	const hostname = getHostname(url);
	return (
		providerByHostname.find(
			([domain]) => hostname === domain || hostname.endsWith(`.${domain}`),
		)?.[1] ?? "generic-web"
	);
}

function getProviderLabel(provider: string, url: string) {
	if (provider !== "generic-web") return providerLabels[provider] ?? "Link";
	return (
		(getHostname(url).split(".")[0] ?? "")
			.replace(/[^a-z0-9]/gi, " ")
			.trim()
			.slice(0, 18) || "Link"
	);
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isHttpsUrl(value: unknown): value is string {
	if (typeof value !== "string") return false;
	try {
		return new URL(value).protocol === "https:";
	} catch {
		return false;
	}
}

function getHttpsUrls(value: unknown): string[] {
	return Array.isArray(value) ? value.filter(isHttpsUrl) : [];
}

function formatProviderCount(value: unknown): string | undefined {
	const count =
		typeof value === "number"
			? value
			: typeof value === "string" && value.trim()
				? Number(value)
				: Number.NaN;
	if (!Number.isFinite(count)) return undefined;
	return compactNumberFormatter.format(count);
}

function getProviderCount(
	provider: string,
	providerData: Record<string, unknown> | undefined,
) {
	if (
		provider === "threads" &&
		typeof providerData?.followerCountLabel === "string" &&
		providerData.followerCountLabel.trim()
	) {
		return providerData.followerCountLabel.trim();
	}
	const countKey = providerCountKeys[provider];
	return countKey ? formatProviderCount(providerData?.[countKey]) : undefined;
}

function getImageUrls(
	provider: string,
	metadata: Record<string, unknown> | undefined,
	providerData: Record<string, unknown> | undefined,
) {
	const recentVideoThumbnailUrls =
		provider === "youtube"
			? getHttpsUrls(providerData?.recentVideoThumbnailUrls)
			: [];
	if (recentVideoThumbnailUrls.length > 0) return recentVideoThumbnailUrls;

	const channelImageUrl =
		provider === "youtube" && isHttpsUrl(providerData?.channelImageUrl)
			? providerData.channelImageUrl
			: undefined;
	const imageUrl = channelImageUrl ?? metadata?.imageUrl;
	return isHttpsUrl(imageUrl) ? [imageUrl] : [];
}

export function resolveLinkPresentation(
	url: string,
	metadata?: Record<string, unknown>,
): PageItemLinkPresentation {
	const provider = getProvider(url);
	const theme = providerTheme[provider];
	const providerData = isRecord(metadata?.providerData)
		? metadata.providerData
		: undefined;
	const actionDetail = theme
		? getProviderCount(provider, providerData)
		: undefined;
	const githubContributionGraph =
		provider === "github" &&
		typeof providerData?.githubContributionGraph === "string" &&
		providerData.githubContributionGraph.trim()
			? providerData.githubContributionGraph
			: undefined;
	const imageUrls = getImageUrls(provider, metadata, providerData);

	return {
		provider,
		providerLabel: getProviderLabel(provider, url),
		...theme,
		...(actionDetail ? { actionDetail } : {}),
		...(provider === "product-hunt" && actionDetail
			? { actionIcon: "upvote" as const, actionLabel: "Upvote" }
			: {}),
		...(imageUrls.length ? { imageUrls } : {}),
		...(githubContributionGraph ? { githubContributionGraph } : {}),
	};
}

export function resolveLinkMetadata(
	url: string,
	metadata?: Record<string, unknown>,
) {
	const presentation = resolveLinkPresentation(url, metadata);
	const hostname = getHostname(url);
	return {
		...(metadata ?? {}),
		...(metadata && Object.hasOwn(metadata, "title")
			? {}
			: { title: hostname }),
		...(metadata?.faviconUrl
			? {}
			: { faviconUrl: `https://icons.duckduckgo.com/ip3/${hostname}.ico` }),
		provider: presentation.provider,
		presentation,
	};
}
