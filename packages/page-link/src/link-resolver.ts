import type {
	PageItemLinkMetadata,
	PageItemLinkPresentation,
} from "@grabbin/api";
import { providerLabels, resolveLinkProvider } from "./provider-data";

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
	countKey: string | undefined,
	providerData: Record<string, unknown> | undefined,
) {
	return countKey ? formatProviderCount(providerData?.[countKey]) : undefined;
}

function getGenericProviderLabel(url: string) {
	return (
		(getHostname(url).split(".")[0] ?? "")
			.replace(/[^a-z0-9]/gi, " ")
			.trim()
			.slice(0, 18) || "Link"
	);
}

export function resolveLinkPresentation(
	url: string,
	metadata?: PageItemLinkMetadata,
): PageItemLinkPresentation {
	const parsedUrl = new URL(url);
	const resolved = resolveLinkProvider(parsedUrl);
	const definition = resolved.definition;
	const providerData = isRecord(metadata?.providerData)
		? metadata.providerData
		: undefined;
	const actionDetail =
		definition?.getActionDetail?.(providerData) ??
		getProviderCount(definition?.countKey, providerData);
	const context = {
		url,
		metadata,
		providerData,
		target: resolved.target,
	};
	const imageUrls = (
		definition?.getImageUrls?.(context) ??
		(typeof metadata?.imageUrl === "string" && isHttpsUrl(metadata.imageUrl)
			? [metadata.imageUrl]
			: [])
	).filter(isHttpsUrl);

	return {
		provider: resolved.id,
		providerLabel:
			providerLabels[resolved.id] ??
			definition?.label ??
			getGenericProviderLabel(url),
		...(definition?.theme ?? {}),
		...(actionDetail ? { actionDetail } : {}),
		...(imageUrls.length ? { imageUrls } : {}),
		...(definition?.present?.(context) ?? {}),
	};
}

export function resolveLinkMetadata(
	url: string,
	metadata?: PageItemLinkMetadata,
) {
	const presentation = resolveLinkPresentation(url, metadata);
	const hostname = getHostname(url);
	const providerFaviconUrl = resolveLinkProvider(new URL(url)).definition
		?.faviconUrl;
	return {
		...(metadata ?? {}),
		...(metadata && Object.hasOwn(metadata, "title")
			? {}
			: { title: hostname }),
		faviconUrl:
			providerFaviconUrl ??
			metadata?.faviconUrl ??
			`https://icons.duckduckgo.com/ip3/${hostname}.ico`,
		provider:
			metadata?.provider === "rss-feed" || metadata?.provider === "tweet"
				? metadata.provider
				: presentation.provider,
		presentation,
	};
}
