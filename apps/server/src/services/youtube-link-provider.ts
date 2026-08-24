import type { PageItemLinkMetadata } from "@grabbin/api";
import type {
	LinkProvider,
	LinkProviderContext,
} from "./link-providers";

const YOUTUBE_API_ORIGIN =
	"https://www.googleapis.com";
const YOUTUBE_API_TIMEOUT_MS = 2500;
const YOUTUBE_HOSTS = new Set([
	"youtube.com",
	"www.youtube.com",
	"m.youtube.com",
	"music.youtube.com",
	"youtu.be",
]);

type YoutubeApiResponse<T> = {
	items?: T[];
};

type YoutubeThumbnail = {
	url?: unknown;
};

type YoutubeChannel = {
	id?: unknown;
	snippet?: {
		title?: unknown;
		description?: unknown;
		thumbnails?: unknown;
	};
	statistics?: {
		subscriberCount?: unknown;
		videoCount?: unknown;
		viewCount?: unknown;
	};
	contentDetails?: {
		relatedPlaylists?: {
			uploads?: unknown;
		};
	};
};

type YoutubePlaylistItem = {
	snippet?: {
		publishedAt?: unknown;
		title?: unknown;
		thumbnails?: unknown;
		resourceId?: {
			videoId?: unknown;
		};
	};
};

type YoutubeVideo = {
	id?: unknown;
	snippet?: {
		title?: unknown;
		description?: unknown;
		channelId?: unknown;
		channelTitle?: unknown;
		publishedAt?: unknown;
		thumbnails?: unknown;
	};
	statistics?: {
		viewCount?: unknown;
		likeCount?: unknown;
		commentCount?: unknown;
	};
};

type YoutubeTarget =
	| {
			type: "channel";
			id: string;
			filter:
				| "id"
				| "forHandle"
				| "forUsername";
	  }
	| { type: "video"; id: string };

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

function getHttpsUrl(
	value: unknown,
	baseUrl: string = YOUTUBE_API_ORIGIN,
): string | undefined {
	const rawValue = asString(value);
	if (!rawValue) return undefined;
	try {
		const imageUrl = new URL(
			rawValue,
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

function getThumbnailUrl(
	value: unknown,
): string | undefined {
	const thumbnails = asRecord(value);
	for (const key of [
		"maxres",
		"standard",
		"high",
		"medium",
		"default",
	]) {
		const thumbnail = asRecord(
			thumbnails?.[key],
		);
		const url = getHttpsUrl(
			(
				thumbnail as
					| YoutubeThumbnail
					| undefined
			)?.url,
		);
		if (url) return url;
	}
	return undefined;
}

function decodeSegment(
	value: string,
): string | undefined {
	try {
		const decoded =
			decodeURIComponent(value);
		return decoded || undefined;
	} catch {
		return undefined;
	}
}

function getYoutubeTarget(
	url: URL,
): YoutubeTarget | undefined {
	if (
		!YOUTUBE_HOSTS.has(
			url.hostname.toLowerCase(),
		)
	) {
		return undefined;
	}

	const segments = url.pathname
		.split("/")
		.filter(Boolean)
		.map(decodeSegment);
	if (
		segments.some((segment) => !segment)
	) {
		return undefined;
	}
	const decodedSegments =
		segments as string[];

	if (
		url.hostname.toLowerCase() ===
		"youtu.be"
	) {
		return decodedSegments.length ===
			1 && decodedSegments[0]
			? {
					type: "video",
					id: decodedSegments[0],
				}
			: undefined;
	}

	const [route, identifier] =
		decodedSegments;
	if (
		route === "channel" &&
		decodedSegments.length === 2 &&
		identifier
	) {
		return {
			type: "channel",
			id: identifier,
			filter: "id",
		};
	}
	if (
		route?.startsWith("@") &&
		decodedSegments.length === 1 &&
		route.length > 1
	) {
		return {
			type: "channel",
			id: route.slice(1),
			filter: "forHandle",
		};
	}
	if (
		route === "user" &&
		decodedSegments.length === 2 &&
		identifier
	) {
		return {
			type: "channel",
			id: identifier,
			filter: "forUsername",
		};
	}
	if (
		route === "watch" &&
		decodedSegments.length === 1
	) {
		const videoId = asString(
			url.searchParams.get("v"),
		);
		return videoId
			? { type: "video", id: videoId }
			: undefined;
	}
	if (
		[
			"shorts",
			"embed",
			"live",
		].includes(route ?? "") &&
		decodedSegments.length === 2 &&
		identifier
	) {
		return {
			type: "video",
			id: identifier,
		};
	}

	return undefined;
}

async function fetchYoutubeApi<T>(
	path: string,
	parameters: Record<string, string>,
	context: LinkProviderContext,
): Promise<
	YoutubeApiResponse<T> | undefined
> {
	const apiKey =
		context.env?.YOUTUBE_API_KEY?.trim();
	if (!apiKey) return undefined;

	const controller =
		new AbortController();
	const timeout = setTimeout(
		() => controller.abort(),
		YOUTUBE_API_TIMEOUT_MS,
	);

	try {
		const endpoint = new URL(
			`/youtube/v3/${path}`,
			YOUTUBE_API_ORIGIN,
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
		endpoint.searchParams.set(
			"key",
			apiKey,
		);
		const response =
			await context.fetch(endpoint, {
				redirect: "manual",
				signal: controller.signal,
				headers: {
					accept: "application/json",
					"user-agent":
						"Mozilla/5.0 ",
				},
			});
		if (!response.ok) return undefined;
		const payload =
			(await response.json()) as unknown;
		return asRecord(payload) as
			| YoutubeApiResponse<T>
			| undefined;
	} catch {
		return undefined;
	} finally {
		clearTimeout(timeout);
	}
}

async function enrichYoutubeChannel(
	target: Extract<
		YoutubeTarget,
		{ type: "channel" }
	>,
	url: URL,
	context: LinkProviderContext,
	fallbackEnrich: LinkProvider["enrich"],
): Promise<PageItemLinkMetadata> {
	const channelResponse =
		await fetchYoutubeApi<YoutubeChannel>(
			"channels",
			{
				part: "contentDetails,snippet,statistics",
				[target.filter]: target.id,
			},
			context,
		);
	const channel =
		channelResponse?.items?.[0];
	if (!channel)
		return fallbackEnrich(url, context);

	const channelId = asString(
		channel.id,
	);
	const channelImageUrl =
		getThumbnailUrl(
			channel.snippet?.thumbnails,
		);
	const uploadsPlaylistId = asString(
		channel.contentDetails
			?.relatedPlaylists?.uploads,
	);
	let recentVideos: YoutubePlaylistItem[] =
		[];
	if (uploadsPlaylistId) {
		const playlistResponse =
			await fetchYoutubeApi<YoutubePlaylistItem>(
				"playlistItems",
				{
					part: "snippet",
					playlistId: uploadsPlaylistId,
					maxResults: "4",
				},
				context,
			);
		recentVideos =
			playlistResponse?.items?.slice(
				0,
				4,
			) ?? [];
	}

	const recentVideo = recentVideos[0];
	const recentVideoId = asString(
		recentVideo?.snippet?.resourceId
			?.videoId,
	);
	const recentVideoThumbnailUrl =
		getThumbnailUrl(
			recentVideo?.snippet?.thumbnails,
		);
	const recentVideoThumbnailUrls =
		recentVideos
			.map((video) =>
				getThumbnailUrl(
					video.snippet?.thumbnails,
				),
			)
			.filter((url): url is string =>
				Boolean(url),
			);
	const metadata: PageItemLinkMetadata =
		{
			title: asString(
				channel.snippet?.title,
			),
			description: asString(
				channel.snippet?.description,
			),
			imageUrl:
				recentVideoThumbnailUrl ??
				channelImageUrl,
			providerData: getProviderData({
				channelId,
				channelImageUrl,
				subscriberCount: asNumber(
					channel.statistics
						?.subscriberCount,
				),
				videoCount: asNumber(
					channel.statistics
						?.videoCount,
				),
				viewCount: asNumber(
					channel.statistics?.viewCount,
				),
				recentVideoId,
				recentVideoTitle: asString(
					recentVideo?.snippet?.title,
				),
				recentVideoThumbnailUrl,
				recentVideoThumbnailUrls:
					recentVideoThumbnailUrls.length >
					0
						? recentVideoThumbnailUrls
						: undefined,
				recentVideoPublishedAt:
					asString(
						recentVideo?.snippet
							?.publishedAt,
					),
				recentVideoUrl: recentVideoId
					? `https://www.youtube.com/watch?v=${encodeURIComponent(recentVideoId)}`
					: undefined,
			}),
		};
	return metadata;
}

async function enrichYoutubeVideo(
	target: Extract<
		YoutubeTarget,
		{ type: "video" }
	>,
	url: URL,
	context: LinkProviderContext,
	fallbackEnrich: LinkProvider["enrich"],
): Promise<PageItemLinkMetadata> {
	const response =
		await fetchYoutubeApi<YoutubeVideo>(
			"videos",
			{
				part: "snippet,statistics",
				id: target.id,
			},
			context,
		);
	const video = response?.items?.[0];
	if (!video)
		return fallbackEnrich(url, context);

	return {
		title: asString(
			video.snippet?.title,
		),
		description: asString(
			video.snippet?.description,
		),
		imageUrl: getThumbnailUrl(
			video.snippet?.thumbnails,
		),
		providerData: getProviderData({
			channelId: asString(
				video.snippet?.channelId,
			),
			channelTitle: asString(
				video.snippet?.channelTitle,
			),
			viewCount: asNumber(
				video.statistics?.viewCount,
			),
			likeCount: asNumber(
				video.statistics?.likeCount,
			),
			commentCount: asNumber(
				video.statistics?.commentCount,
			),
			publishedAt: asString(
				video.snippet?.publishedAt,
			),
		}),
	};
}

async function enrichYoutubeRoute(
	url: URL,
	context: LinkProviderContext,
	fallbackEnrich: LinkProvider["enrich"],
): Promise<PageItemLinkMetadata> {
	const target = getYoutubeTarget(url);
	if (!target)
		return fallbackEnrich(url, context);
	return target.type === "channel"
		? enrichYoutubeChannel(
				target,
				url,
				context,
				fallbackEnrich,
			)
		: enrichYoutubeVideo(
				target,
				url,
				context,
				fallbackEnrich,
			);
}

export function createYoutubeEnricher(
	fallbackEnrich: LinkProvider["enrich"],
): LinkProvider["enrich"] {
	return (url, context) =>
		enrichYoutubeRoute(
			url,
			context,
			fallbackEnrich,
		);
}
