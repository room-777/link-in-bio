import type { PageItemLinkMetadata } from "@grabbin/api";
import type {
	LinkProvider,
	LinkProviderContext,
} from "./link-providers";

const CHZZK_API_ORIGIN =
	"https://openapi.chzzk.naver.com";
const CHZZK_API_TIMEOUT_MS = 2500;
const CHZZK_CHANNEL_ID_PATTERN =
	/^[a-f\d]{32}$/i;

type ChzzkApiResponse = {
	code?: unknown;
	content?: unknown;
	data?: unknown;
};

type ChzzkChannel = {
	channelId?: unknown;
	channelName?: unknown;
	channelImageUrl?: unknown;
	followerCount?: unknown;
	verifiedMark?: unknown;
};

type ChzzkLive = {
	channelId?: unknown;
	channelName?: unknown;
	channelImageUrl?: unknown;
	liveId?: unknown;
	liveTitle?: unknown;
	liveThumbnailImageUrl?: unknown;
	concurrentUserCount?: unknown;
	liveCategoryValue?: unknown;
};

function asRecord(
	value: unknown,
): Record<string, unknown> | undefined {
	return typeof value === "object" &&
		value !== null
		? (value as Record<string, unknown>)
		: undefined;
}

function asString(
	value: unknown,
): string | undefined {
	return typeof value === "string" &&
		value.trim()
		? value.trim()
		: undefined;
}

function asNumber(
	value: unknown,
): number | undefined {
	const number =
		typeof value === "number"
			? value
			: typeof value === "string" &&
					value.trim()
				? Number(value)
				: Number.NaN;
	return Number.isFinite(number)
		? number
		: undefined;
}

function asBoolean(
	value: unknown,
): boolean | undefined {
	return typeof value === "boolean"
		? value
		: undefined;
}

function getProviderData(
	values: Record<string, unknown>,
): PageItemLinkMetadata["providerData"] {
	const defined = Object.fromEntries(
		Object.entries(values).filter(
			([, value]) =>
				value !== undefined,
		),
	);
	return Object.keys(defined).length > 0
		? (defined as PageItemLinkMetadata["providerData"])
		: undefined;
}

function getHttpsImageUrl(
	value: unknown,
	baseUrl: URL,
): string | undefined {
	const rawValue = asString(value);
	if (!rawValue) return undefined;
	try {
		const imageUrl = new URL(
			rawValue.replace("{type}", "640"),
			baseUrl,
		);
		return imageUrl.protocol ===
			"https:"
			? imageUrl.toString()
			: undefined;
	} catch {
		return undefined;
	}
}

function getApiItems(
	payload: ChzzkApiResponse | undefined,
): Record<string, unknown>[] {
	const containers = [
		payload?.content,
		payload?.data,
	];
	for (const container of containers) {
		const candidates = [
			container,
			asRecord(container)?.data,
			asRecord(container)?.content,
		];
		for (const candidate of candidates) {
			if (!Array.isArray(candidate))
				continue;
			return candidate
				.map(asRecord)
				.filter(
					(
						record,
					): record is Record<
						string,
						unknown
					> => Boolean(record),
				);
		}
	}
	return [];
}

async function fetchChzzkApi(
	path: string,
	parameters: Record<string, string>,
	context: LinkProviderContext,
): Promise<
	ChzzkApiResponse | undefined
> {
	const clientId =
		context.env?.CHZZK_CLIENT_ID?.trim();
	const clientSecret =
		context.env?.CHZZK_CLIENT_SECRET?.trim();
	if (!clientId || !clientSecret)
		return undefined;

	const controller =
		new AbortController();
	const timeout = setTimeout(
		() => controller.abort(),
		CHZZK_API_TIMEOUT_MS,
	);
	try {
		const endpoint = new URL(
			`/open/v1/${path}`,
			CHZZK_API_ORIGIN,
		);
		for (const [
			key,
			value,
		] of Object.entries(parameters)) {
			endpoint.searchParams.set(
				key,
				value,
			);
		}
		const response =
			await context.fetch(endpoint, {
				redirect: "manual",
				signal: controller.signal,
				headers: {
					accept: "application/json",
					"content-type":
						"application/json",
					"Client-Id": clientId,
					"Client-Secret": clientSecret,
					"user-agent":
						"Mozilla/5.0 ",
				},
			});
		if (!response.ok) return undefined;
		const contentType = response.headers
			.get("content-type")
			?.toLowerCase();
		if (
			contentType &&
			!contentType.includes("json")
		) {
			return undefined;
		}
		const payload =
			(await response.json()) as unknown;
		return asRecord(payload) as
			| ChzzkApiResponse
			| undefined;
	} catch {
		return undefined;
	} finally {
		clearTimeout(timeout);
	}
}

async function enrichChzzkChannel(
	channelId: string,
	url: URL,
	context: LinkProviderContext,
	fallbackEnrich: LinkProvider["enrich"],
): Promise<PageItemLinkMetadata> {
	const response = await fetchChzzkApi(
		"channels",
		{ channelIds: channelId },
		context,
	);
	const channel = getApiItems(
		response,
	)[0] as ChzzkChannel | undefined;
	if (!channel)
		return fallbackEnrich(url, context);

	const channelImageUrl =
		getHttpsImageUrl(
			channel.channelImageUrl,
			url,
		);
	return {
		title: asString(
			channel.channelName,
		),
		imageUrl: channelImageUrl,
		providerData: getProviderData({
			channelId:
				asString(channel.channelId) ??
				channelId,
			followerCount: asNumber(
				channel.followerCount,
			),
			verifiedMark: asBoolean(
				channel.verifiedMark,
			),
			channelImageUrl,
		}),
	};
}

async function enrichChzzkLive(
	channelId: string,
	url: URL,
	context: LinkProviderContext,
	fallbackEnrich: LinkProvider["enrich"],
): Promise<PageItemLinkMetadata> {
	const response = await fetchChzzkApi(
		"lives",
		{ size: "20" },
		context,
	);
	const live = getApiItems(
		response,
	).find(
		(item) =>
			asString(item.channelId) ===
			channelId,
	) as ChzzkLive | undefined;
	if (!live)
		return fallbackEnrich(url, context);

	const channelName = asString(
		live.channelName,
	);
	const liveTitle = asString(
		live.liveTitle,
	);
	const liveThumbnailUrl =
		getHttpsImageUrl(
			live.liveThumbnailImageUrl,
			url,
		);
	return {
		title:
			channelName && liveTitle
				? `${channelName} - ${liveTitle}`
				: (liveTitle ?? channelName),
		description: asString(
			live.liveCategoryValue,
		),
		imageUrl: liveThumbnailUrl,
		providerData: getProviderData({
			channelId:
				asString(live.channelId) ??
				channelId,
			liveId: asString(live.liveId),
			isLive: true,
			liveTitle,
			liveViewerCount: asNumber(
				live.concurrentUserCount,
			),
			liveThumbnailUrl,
			channelImageUrl: getHttpsImageUrl(
				live.channelImageUrl,
				url,
			),
		}),
	};
}

async function enrichChzzkRoute(
	url: URL,
	context: LinkProviderContext,
	fallbackEnrich: LinkProvider["enrich"],
): Promise<PageItemLinkMetadata> {
	const segments = url.pathname
		.split("/")
		.filter(Boolean);
	if (
		segments.length === 1 &&
		CHZZK_CHANNEL_ID_PATTERN.test(
			segments[0] ?? "",
		)
	) {
		return enrichChzzkChannel(
			segments[0] as string,
			url,
			context,
			fallbackEnrich,
		);
	}

	const [route, identifier] = segments;
	if (
		(route === "live" ||
			route === "livechat") &&
		CHZZK_CHANNEL_ID_PATTERN.test(
			identifier ?? "",
		)
	) {
		return enrichChzzkLive(
			identifier as string,
			url,
			context,
			fallbackEnrich,
		);
	}

	// The official Open API exposes channel and current-live data, but not a
	// public per-channel recent VOD/clips list. Do not call CHZZK's private
	// /service/* endpoints; let the generic provider use OG metadata instead.
	return fallbackEnrich(url, context);
}

export function createChzzkEnricher(
	fallbackEnrich: LinkProvider["enrich"],
): LinkProvider["enrich"] {
	return (url, context) =>
		enrichChzzkRoute(
			url,
			context,
			fallbackEnrich,
		);
}
