import type { PageItemLinkMetadata } from "@grabbin/api";
import type {
	LinkProvider,
	LinkProviderContext,
	TwitchUserToken,
} from "./link-providers";

const TWITCH_AUTH_ORIGIN =
	"https://id.twitch.tv";
const TWITCH_API_ORIGIN =
	"https://api.twitch.tv";
const TWITCH_API_TIMEOUT_MS = 2500;
const TWITCH_HOSTS = new Set([
	"twitch.tv",
	"www.twitch.tv",
	"m.twitch.tv",
]);
const RESERVED_TWITCH_ROUTES = new Set([
	"directory",
	"downloads",
	"jobs",
	"search",
	"settings",
	"subscriptions",
	"turbo",
	"videos",
	"video",
	"clips",
	"p",
	"products",
	"moderator",
	"friends",
	"inventory",
	"drops",
	"wallet",
	"communities",
	"transmit",
	"login",
	"signup",
	"404",
]);

type TwitchTokenResponse = {
	access_token?: unknown;
	refresh_token?: unknown;
	expires_in?: unknown;
};

type TwitchUser = {
	id?: unknown;
	login?: unknown;
	display_name?: unknown;
	description?: unknown;
	profile_image_url?: unknown;
};

type TwitchStream = {
	title?: unknown;
	viewer_count?: unknown;
	thumbnail_url?: unknown;
};

type TwitchVideo = {
	id?: unknown;
	title?: unknown;
	created_at?: unknown;
	thumbnail_url?: unknown;
};

type TwitchApiResponse<T> = {
	data?: T[];
	total?: unknown;
};

type TwitchApiResult<T> = {
	payload?: TwitchApiResponse<T>;
	status: number;
};

type CachedAppToken = {
	clientId: string;
	clientSecret: string;
	accessToken: string;
	expiresAt: number;
};

let cachedAppToken:
	| CachedAppToken
	| undefined;

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
): string | undefined {
	const rawValue = asString(value);
	if (!rawValue) return undefined;
	try {
		const imageUrl = new URL(rawValue);
		return imageUrl.protocol ===
			"https:"
			? imageUrl.toString()
			: undefined;
	} catch {
		return undefined;
	}
}

function getTwitchThumbnailUrl(
	value: unknown,
): string | undefined {
	const template = asString(value);
	return getHttpsUrl(
		template
			?.replaceAll("{width}", "640")
			.replaceAll("{height}", "360"),
	);
}

function getTwitchLogin(
	url: URL,
): string | undefined {
	if (
		!TWITCH_HOSTS.has(
			url.hostname.toLowerCase(),
		)
	) {
		return undefined;
	}
	const segments = url.pathname
		.split("/")
		.filter(Boolean);
	if (segments.length !== 1)
		return undefined;
	const login = segments[0];
	if (
		!login ||
		RESERVED_TWITCH_ROUTES.has(
			login.toLowerCase(),
		)
	) {
		return undefined;
	}
	return login;
}

async function getTwitchAppToken(
	context: LinkProviderContext,
): Promise<string | undefined> {
	const clientId =
		context.env?.TWITCH_CLIENT_ID?.trim();
	const clientSecret =
		context.env?.TWITCH_CLIENT_SECRET?.trim();
	const userToken =
		context.env?.TWITCH_USER_ACCESS_TOKEN?.trim();
	if (!clientId) return undefined;
	if (!clientSecret) return userToken;

	if (
		cachedAppToken &&
		cachedAppToken.clientId ===
			clientId &&
		cachedAppToken.clientSecret ===
			clientSecret &&
		cachedAppToken.expiresAt >
			Date.now()
	) {
		return cachedAppToken.accessToken;
	}

	const controller =
		new AbortController();
	const timeout = setTimeout(
		() => controller.abort(),
		TWITCH_API_TIMEOUT_MS,
	);
	try {
		const endpoint = new URL(
			"/oauth2/token",
			TWITCH_AUTH_ORIGIN,
		);
		endpoint.searchParams.set(
			"client_id",
			clientId,
		);
		endpoint.searchParams.set(
			"client_secret",
			clientSecret,
		);
		endpoint.searchParams.set(
			"grant_type",
			"client_credentials",
		);
		const response =
			await context.fetch(endpoint, {
				method: "POST",
				redirect: "manual",
				signal: controller.signal,
				headers: {
					accept: "application/json",
					"user-agent":
						"Mozilla/5.0 ",
				},
			});
		if (!response.ok) return userToken;
		const payload =
			(await response.json()) as TwitchTokenResponse;
		const accessToken = asString(
			payload.access_token,
		);
		const expiresIn =
			asNumber(payload.expires_in) ??
			3600;
		if (!accessToken) return userToken;
		cachedAppToken = {
			clientId,
			clientSecret,
			accessToken,
			expiresAt:
				Date.now() +
				Math.max(1, expiresIn - 60) *
					1000,
		};
		return accessToken;
	} catch {
		return userToken;
	} finally {
		clearTimeout(timeout);
	}
}

async function readStoredTwitchUserToken(
	context: LinkProviderContext,
): Promise<
	TwitchUserToken | undefined
> {
	if (!context.twitchUserTokenStore)
		return undefined;
	try {
		return await context.twitchUserTokenStore.get();
	} catch {
		return undefined;
	}
}

async function persistTwitchUserToken(
	context: LinkProviderContext,
	token: TwitchUserToken,
): Promise<void> {
	try {
		await context.twitchUserTokenStore?.set(
			token,
		);
	} catch {
		// A storage failure must not discard a valid token for this request.
	}
}

async function refreshTwitchUserToken(
	context: LinkProviderContext,
	refreshToken: string,
): Promise<
	TwitchUserToken | undefined
> {
	const clientId =
		context.env?.TWITCH_CLIENT_ID?.trim();
	const clientSecret =
		context.env?.TWITCH_CLIENT_SECRET?.trim();
	if (!clientId || !clientSecret)
		return undefined;

	const controller =
		new AbortController();
	const timeout = setTimeout(
		() => controller.abort(),
		TWITCH_API_TIMEOUT_MS,
	);
	try {
		const body = new URLSearchParams({
			client_id: clientId,
			client_secret: clientSecret,
			grant_type: "refresh_token",
			refresh_token: refreshToken,
		});
		const response =
			await context.fetch(
				new URL(
					"/oauth2/token",
					TWITCH_AUTH_ORIGIN,
				),
				{
					method: "POST",
					redirect: "manual",
					signal: controller.signal,
					headers: {
						accept: "application/json",
						"content-type":
							"application/x-www-form-urlencoded",
						"user-agent":
							"Mozilla/5.0 ",
					},
					body: body.toString(),
				},
			);
		if (!response.ok) return undefined;
		const payload =
			(await response.json()) as TwitchTokenResponse;
		const accessToken = asString(
			payload.access_token,
		);
		if (!accessToken) return undefined;
		const expiresIn =
			asNumber(payload.expires_in) ??
			3600;
		return {
			accessToken,
			refreshToken:
				asString(
					payload.refresh_token,
				) ?? refreshToken,
			expiresAt:
				Date.now() +
				Math.max(1, expiresIn - 60) *
					1000,
		};
	} catch {
		return undefined;
	} finally {
		clearTimeout(timeout);
	}
}

async function getTwitchUserToken(
	context: LinkProviderContext,
): Promise<
	TwitchUserToken | undefined
> {
	const storedToken =
		await readStoredTwitchUserToken(
			context,
		);
	const accessToken =
		storedToken?.accessToken ??
		context.env?.TWITCH_USER_ACCESS_TOKEN?.trim();
	const refreshToken =
		storedToken?.refreshToken ??
		context.env?.TWITCH_USER_REFRESH_TOKEN?.trim();
	if (accessToken) {
		return {
			accessToken,
			refreshToken,
			expiresAt: storedToken?.expiresAt,
		};
	}
	if (!refreshToken) return undefined;

	const refreshedToken =
		await refreshTwitchUserToken(
			context,
			refreshToken,
		);
	if (refreshedToken)
		await persistTwitchUserToken(
			context,
			refreshedToken,
		);
	return refreshedToken;
}

async function fetchTwitchApi<T>(
	path: string,
	parameters: Record<string, string>,
	token: string,
	context: LinkProviderContext,
): Promise<TwitchApiResult<T>> {
	const controller =
		new AbortController();
	const timeout = setTimeout(
		() => controller.abort(),
		TWITCH_API_TIMEOUT_MS,
	);
	try {
		const endpoint = new URL(
			`/helix/${path}`,
			TWITCH_API_ORIGIN,
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
					"Client-Id":
						context.env?.TWITCH_CLIENT_ID?.trim() ??
						"",
					Authorization: `Bearer ${token}`,
					"user-agent":
						"Mozilla/5.0 ",
				},
			});
		if (!response.ok)
			return {
				status: response.status,
			};
		const payload =
			(await response.json()) as unknown;
		return {
			status: response.status,
			payload: asRecord(payload) as
				| TwitchApiResponse<T>
				| undefined,
		};
	} catch {
		return { status: 0 };
	} finally {
		clearTimeout(timeout);
	}
}

async function enrichTwitchRoute(
	url: URL,
	context: LinkProviderContext,
	fallbackEnrich: LinkProvider["enrich"],
): Promise<PageItemLinkMetadata> {
	const login = getTwitchLogin(url);
	const clientId =
		context.env?.TWITCH_CLIENT_ID?.trim();
	if (!login || !clientId) {
		return fallbackEnrich(url, context);
	}

	const token =
		await getTwitchAppToken(context);
	if (!token)
		return fallbackEnrich(url, context);

	const userResponse =
		await fetchTwitchApi<TwitchUser>(
			"users",
			{ login },
			token,
			context,
		);
	const user =
		userResponse.payload?.data?.[0];
	const userId = asString(user?.id);
	if (!user || !userId)
		return fallbackEnrich(url, context);

	const userToken =
		await getTwitchUserToken(context);
	const [
		initialFollowersResponse,
		streamsResponse,
		videosResponse,
	] = await Promise.all([
		userToken
			? fetchTwitchApi<never>(
					"channels/followers",
					{
						broadcaster_id: userId,
					},
					userToken.accessToken,
					context,
				)
			: Promise.resolve<
					| TwitchApiResult<never>
					| undefined
				>(undefined),
		fetchTwitchApi<TwitchStream>(
			"streams",
			{ user_id: userId },
			token,
			context,
		),
		fetchTwitchApi<TwitchVideo>(
			"videos",
			{
				user_id: userId,
				first: "1",
				sort: "time",
			},
			token,
			context,
		),
	]);

	let followersResponse =
		initialFollowersResponse;
	if (
		userToken &&
		initialFollowersResponse?.status ===
			401 &&
		userToken.refreshToken
	) {
		const storedToken =
			await readStoredTwitchUserToken(
				context,
			);
		const refreshedToken =
			storedToken?.accessToken !==
			userToken.accessToken
				? storedToken
				: await refreshTwitchUserToken(
						context,
						userToken.refreshToken,
					);
		if (refreshedToken) {
			await persistTwitchUserToken(
				context,
				refreshedToken,
			);
			followersResponse =
				await fetchTwitchApi<never>(
					"channels/followers",
					{
						broadcaster_id: userId,
					},
					refreshedToken.accessToken,
					context,
				);
		}
	}

	const stream =
		streamsResponse.payload?.data?.[0];
	const video =
		videosResponse.payload?.data?.[0];
	const videoId = asString(video?.id);
	const liveThumbnailUrl =
		getTwitchThumbnailUrl(
			stream?.thumbnail_url,
		);
	const recentVideoThumbnailUrl =
		getTwitchThumbnailUrl(
			video?.thumbnail_url,
		);
	const providerData = getProviderData({
		channelId: userId,
		profileImageUrl: getHttpsUrl(
			user.profile_image_url,
		),
		followerCount: asNumber(
			followersResponse?.payload?.total,
		),
		...(streamsResponse.payload
			? {
					isLive: Boolean(stream),
					viewerCount: asNumber(
						stream?.viewer_count,
					),
					liveTitle: asString(
						stream?.title,
					),
					liveThumbnailUrl,
				}
			: {}),
		recentVideoId: videoId,
		recentVideoTitle: asString(
			video?.title,
		),
		recentVideoThumbnailUrl,
		recentVideoPublishedAt: asString(
			video?.created_at,
		),
		recentVideoUrl: videoId
			? `https://www.twitch.tv/videos/${encodeURIComponent(videoId)}`
			: undefined,
	});

	return {
		title:
			asString(user.display_name) ??
			asString(user.login) ??
			login,
		description: asString(
			user.description,
		),
		imageUrl:
			liveThumbnailUrl ??
			recentVideoThumbnailUrl ??
			getHttpsUrl(
				user.profile_image_url,
			),
		providerData,
	};
}

export function createTwitchEnricher(
	fallbackEnrich: LinkProvider["enrich"],
): LinkProvider["enrich"] {
	return (url, context) =>
		enrichTwitchRoute(
			url,
			context,
			fallbackEnrich,
		);
}
