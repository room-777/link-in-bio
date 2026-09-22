import type { PageItemLinkMetadata } from "@grabbin/api";
import { providerByHostname } from "@grabbin/page-link";
import type { AppEnv } from "../types";

const PROVIDER_FETCH_TIMEOUT_MS = 2500;
const MAX_PROVIDER_HTML_BYTES = 2 * 1024 * 1024;
const MAX_PROVIDER_JSON_BYTES = 512 * 1024;
const COUNT_MULTIPLIERS: Record<string, number> = {
	K: 1_000,
	M: 1_000_000,
	B: 1_000_000_000,
};

export type LinkProviderEnvironment = Partial<
	Pick<
		AppEnv["Bindings"],
		| "YOUTUBE_API_KEY"
		| "CHZZK_CLIENT_ID"
		| "CHZZK_CLIENT_SECRET"
		| "TWITCH_CLIENT_ID"
		| "TWITCH_CLIENT_SECRET"
		| "TWITCH_USER_ACCESS_TOKEN"
		| "GITHUB_TOKEN"
		| "PRODUCT_HUNT_TOKEN"
	>
>;

export type LinkProviderContext = {
	fetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
	env?: LinkProviderEnvironment;
};

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asRecord(value: unknown) {
	return isRecord(value) ? value : undefined;
}

function asString(value: unknown) {
	return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function asNumber(value: unknown) {
	const number =
		typeof value === "number"
			? value
			: typeof value === "string" && value.trim()
				? Number(value)
				: Number.NaN;
	return Number.isFinite(number) ? number : undefined;
}

function getProviderData(values: Record<string, unknown>) {
	const defined = Object.entries(values).filter(
		([, value]) => value !== undefined,
	);
	return defined.length
		? (Object.fromEntries(defined) as PageItemLinkMetadata["providerData"])
		: undefined;
}

function decodeHtmlEntities(value: string) {
	return value.replace(
		/&(?:#x([\da-f]+)|#(\d+)|amp|quot|apos|lt|gt);/gi,
		(match, hex: string | undefined, decimal: string | undefined) => {
			if (hex || decimal) {
				const codePoint = Number.parseInt(hex ?? decimal ?? "", hex ? 16 : 10);
				return Number.isInteger(codePoint) &&
					codePoint >= 0 &&
					codePoint <= 0x10ffff
					? String.fromCodePoint(codePoint)
					: match;
			}
			return (
				{
					amp: "&",
					quot: '"',
					apos: "'",
					lt: "<",
					gt: ">",
				}[match.slice(1, -1).toLowerCase()] ?? match
			);
		},
	);
}

function getAttributeValue(tag: string, name: string) {
	const match = tag.match(
		new RegExp(
			`(?:^|\\s)${name}\\s*=\\s*(?:["']([^"']*)["']|([^\\s"'=<>]+))`,
			"i",
		),
	);
	return match?.[1]?.trim() || match?.[2]?.trim() || undefined;
}

function getMetaContent(html: string, names: readonly string[]) {
	for (const match of html.matchAll(/<meta\b([^>]+)>/gi)) {
		const attributes = match[1] ?? "";
		const key =
			getAttributeValue(attributes, "property") ??
			getAttributeValue(attributes, "name");
		if (!key || !names.includes(key.toLowerCase())) continue;
		const content = getAttributeValue(attributes, "content");
		if (content) return decodeHtmlEntities(content);
	}
	return undefined;
}

function getPageTitle(html: string) {
	const title = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1];
	return title
		? decodeHtmlEntities(title.replace(/<[^>]+>/g, "")).trim() || undefined
		: undefined;
}

function limitText(value: string | undefined, maxLength: number) {
	const text = value?.trim();
	return text ? text.slice(0, maxLength) : undefined;
}

function getHttpsUrl(value: unknown, baseUrl?: URL) {
	const rawValue = asString(value);
	if (!rawValue) return undefined;
	try {
		const url = new URL(rawValue, baseUrl);
		return url.protocol === "https:" ? url.toString() : undefined;
	} catch {
		return undefined;
	}
}

function parseHtmlMetadata(html: string, baseUrl: URL) {
	const title = limitText(
		getMetaContent(html, ["og:title", "twitter:title"]) ?? getPageTitle(html),
		240,
	);
	const description = limitText(
		getMetaContent(html, [
			"description",
			"og:description",
			"twitter:description",
		]),
		1200,
	);
	const imageUrl = getHttpsUrl(
		getMetaContent(html, ["og:image", "twitter:image"]),
		baseUrl,
	);
	return {
		...(title ? { title } : {}),
		...(description ? { description } : {}),
		...(imageUrl ? { imageUrl } : {}),
	} satisfies PageItemLinkMetadata;
}

function parseCountLabel(label: string) {
	const normalized = label.trim().replace(/\s+/g, "");
	const match = normalized.match(/^([\d.,]+)([KMB])?$/i);
	if (!match) return undefined;
	const raw = match[1];
	if (!raw) return undefined;
	const suffix = match[2]?.toUpperCase();
	const number = Number(raw.replace(/,/g, ""));
	if (!Number.isFinite(number)) return undefined;
	const multiplier = COUNT_MULTIPLIERS[suffix ?? ""] ?? 1;
	return {
		followerCount: number * multiplier,
		followerCountLabel: normalized,
		followerCountApproximate: Boolean(suffix),
	};
}

async function readResponseText(response: Response, maxBytes: number) {
	if (!response.body) return "";
	const reader = response.body.getReader();
	const decoder = new TextDecoder();
	let total = 0;
	let text = "";
	try {
		for (;;) {
			const { done, value } = await reader.read();
			if (done) break;
			if (!value) continue;
			if (total + value.byteLength > maxBytes) {
				await reader.cancel();
				return undefined;
			}
			total += value.byteLength;
			text += decoder.decode(value, { stream: true });
		}
		return text + decoder.decode();
	} finally {
		reader.releaseLock();
	}
}

async function fetchHtml(
	url: URL,
	context: LinkProviderContext,
	options?: { userAgent?: string },
) {
	const controller = new AbortController();
	const timeout = setTimeout(
		() => controller.abort(),
		PROVIDER_FETCH_TIMEOUT_MS,
	);
	try {
		const response = await context.fetch(url, {
			redirect: "follow",
			signal: controller.signal,
			headers: {
				Accept: "text/html,application/xhtml+xml;q=0.9",
				"User-Agent":
					options?.userAgent ?? "Mozilla/5.0 Grabbin Link Preview/1.0",
			},
		});
		if (!response.ok) return undefined;
		const contentType = response.headers.get("content-type")?.toLowerCase();
		if (contentType && !contentType.includes("html")) return undefined;
		return await readResponseText(response, MAX_PROVIDER_HTML_BYTES);
	} catch {
		return undefined;
	} finally {
		clearTimeout(timeout);
	}
}

async function fetchJson(
	url: string | URL,
	context: LinkProviderContext,
	init?: RequestInit,
) {
	const controller = new AbortController();
	const timeout = setTimeout(
		() => controller.abort(),
		PROVIDER_FETCH_TIMEOUT_MS,
	);
	try {
		const response = await context.fetch(url, {
			...init,
			redirect: "manual",
			signal: controller.signal,
		});
		if (!response.ok) return undefined;
		const body = await readResponseText(response, MAX_PROVIDER_JSON_BYTES);
		return body === undefined ? undefined : (JSON.parse(body) as unknown);
	} catch {
		return undefined;
	} finally {
		clearTimeout(timeout);
	}
}

function resolveLinkProviderId(url: URL) {
	const hostname = url.hostname.toLowerCase();
	return (
		providerByHostname.find(
			([domain]) => hostname === domain || hostname.endsWith(`.${domain}`),
		)?.[1] ?? "generic-web"
	);
}
function isXProfile(url: URL) {
	return (
		new Set(["x.com", "www.x.com", "twitter.com", "www.twitter.com"]).has(
			url.hostname.toLowerCase(),
		) && /^\/[a-z\d_]+\/?$/i.test(url.pathname)
	);
}

// ponytail: use public profile HTML for social counts; add official APIs if markup stops exposing them.
async function enrichX(url: URL, context: LinkProviderContext) {
	if (!isXProfile(url)) return {};
	const html = await fetchHtml(
		new URL(`https://x.com${url.pathname}`),
		context,
	);
	if (!html) return {};
	const metadata = parseHtmlMetadata(html, url);
	const descriptionFollowerLabel = metadata.description?.match(
		/([\d.,]+\s*[KMB]?)\s+followers\b/i,
	)?.[1];
	const rawFollowerCount = html.match(
		/(?:^|[^\w])["']?followers(?:_count|Count)?["']?\s*:\s*(\d+)/i,
	)?.[1];
	const followerData = descriptionFollowerLabel
		? parseCountLabel(descriptionFollowerLabel)
		: rawFollowerCount
			? parseCountLabel(rawFollowerCount)
			: undefined;
	return {
		...metadata,
		...(followerData ? { providerData: followerData } : {}),
	};
}

function isInstagramProfile(url: URL) {
	const reserved = new Set([
		"accounts",
		"direct",
		"explore",
		"p",
		"reel",
		"reels",
		"stories",
	]);
	const segment = url.pathname.split("/").filter(Boolean)[0]?.toLowerCase();
	return (
		["instagram.com", "www.instagram.com"].includes(
			url.hostname.toLowerCase(),
		) &&
		Boolean(segment) &&
		!reserved.has(segment ?? "") &&
		/^\/[a-z\d._]+\/?$/i.test(url.pathname)
	);
}

async function enrichInstagram(url: URL, context: LinkProviderContext) {
	if (!isInstagramProfile(url)) return {};
	const html = await fetchHtml(
		new URL(`https://www.instagram.com${url.pathname}`),
		context,
	);
	if (!html) return {};
	const metadata = parseHtmlMetadata(html, url);
	const followerLabel = metadata.description?.match(
		/([\d.,]+\s*[KMB]?)\s+followers\b/i,
	)?.[1];
	const followerData = followerLabel
		? parseCountLabel(followerLabel)
		: undefined;
	return {
		...metadata,
		...(followerData ? { providerData: followerData } : {}),
	};
}

function isThreadsProfile(url: URL) {
	return (
		[
			"threads.com",
			"www.threads.com",
			"threads.net",
			"www.threads.net",
		].includes(url.hostname.toLowerCase()) &&
		/^\/@[a-z\d._]+\/?$/i.test(url.pathname)
	);
}

async function enrichThreads(url: URL, context: LinkProviderContext) {
	if (!isThreadsProfile(url)) return {};
	const html = await fetchHtml(
		new URL(`https://www.threads.com${url.pathname}`),
		context,
	);
	if (!html) return {};
	const metadata = parseHtmlMetadata(html, url);
	const followerLabel = metadata.description?.match(
		/([\d.,]+\s*[KMB]?)\s+followers\b/i,
	)?.[1];
	const followerData = followerLabel
		? parseCountLabel(followerLabel)
		: undefined;
	return {
		...metadata,
		...(followerData ? { providerData: followerData } : {}),
	};
}

function getScriptJson(html: string, id: string) {
	const escapedId = id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	const match = html.match(
		new RegExp(
			`<script\\b[^>]*\\bid=["']${escapedId}["'][^>]*>([\\s\\S]*?)<\\/script>`,
			"i",
		),
	);
	if (!match?.[1]) return undefined;
	try {
		return JSON.parse(match[1]) as unknown;
	} catch {
		return undefined;
	}
}

async function enrichTikTok(url: URL, context: LinkProviderContext) {
	if (
		!["tiktok.com", "www.tiktok.com"].includes(url.hostname.toLowerCase()) ||
		!/^\/@[a-z\d._]+\/?$/i.test(url.pathname)
	) {
		return {};
	}
	const html = await fetchHtml(
		new URL(`https://www.tiktok.com${url.pathname}`),
		context,
		{
			userAgent:
				"Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148",
		},
	);
	if (!html) return {};
	const metadata = parseHtmlMetadata(html, url);
	const hydration = getScriptJson(html, "__UNIVERSAL_DATA_FOR_REHYDRATION__");
	const scope = isRecord(hydration)
		? asRecord(hydration.__DEFAULT_SCOPE__)
		: undefined;
	const detail = asRecord(scope?.["webapp.user-detail"]);
	const userInfo = asRecord(detail?.userInfo);
	const user = asRecord(userInfo?.user);
	const stats = asRecord(userInfo?.stats);
	const followerCount =
		asNumber(stats?.followerCount) ??
		asNumber(html.match(/"followerCount"\s*:\s*(\d+)/i)?.[1]);
	if (followerCount === undefined) return metadata;
	const title = metadata.title ?? asString(user?.nickname);
	const description = metadata.description ?? asString(user?.signature);
	const imageUrl = metadata.imageUrl ?? getHttpsUrl(user?.avatarLarger, url);
	return {
		...(title ? { title } : {}),
		...(description ? { description } : {}),
		...(imageUrl ? { imageUrl } : {}),
		providerData: {
			followerCount,
			followerCountLabel: String(followerCount),
			followerCountApproximate: false,
		},
	};
}

function getGithubUsername(url: URL) {
	if (!["github.com", "www.github.com"].includes(url.hostname.toLowerCase())) {
		return undefined;
	}
	return url.pathname.match(/^\/([a-z\d](?:[a-z\d-]{0,38}[a-z\d])?)\/?$/i)?.[1];
}

async function getGithubContributionGraph(
	username: string,
	context: LinkProviderContext,
) {
	const token = asString(context.env?.GITHUB_TOKEN);
	if (!token) return undefined;
	const payload = asRecord(
		await fetchJson("https://api.github.com/graphql", context, {
			method: "POST",
			headers: {
				Accept: "application/json",
				Authorization: `Bearer ${token}`,
				"Content-Type": "application/json",
				"User-Agent": "Grabbin Link Preview/1.0",
			},
			body: JSON.stringify({
				query: `query ($login: String!) {
					user(login: $login) {
						contributionsCollection {
							contributionCalendar {
								totalContributions colors weeks {
									contributionDays { contributionCount contributionLevel color weekday }
								}
							}
						}
					}
				}`,
				variables: { login: username },
			}),
		}),
	);
	const data = asRecord(payload?.data);
	const user = asRecord(data?.user);
	const collection = asRecord(user?.contributionsCollection);
	const calendar = asRecord(collection?.contributionCalendar);
	const weeks = Array.isArray(calendar?.weeks) ? calendar.weeks : undefined;
	if (typeof calendar?.totalContributions !== "number" || !weeks)
		return undefined;
	const levels: Record<string, 0 | 1 | 2 | 3 | 4> = {
		NONE: 0,
		FIRST_QUARTILE: 1,
		SECOND_QUARTILE: 2,
		THIRD_QUARTILE: 3,
		FOURTH_QUARTILE: 4,
	};
	const colors = Array.isArray(calendar.colors)
		? calendar.colors.filter(
				(color): color is string => typeof color === "string",
			)
		: [];
	return JSON.stringify({
		totalContributions: calendar.totalContributions,
		weeks: weeks.map((week) => {
			const weekRecord = asRecord(week);
			const days = Array.from({ length: 7 }, (_, weekday) => ({
				count: 0,
				level: 0,
				color: colors[0] ?? "#ebedf0",
				weekday,
			}));
			const contributionDays = Array.isArray(weekRecord?.contributionDays)
				? weekRecord.contributionDays
				: [];
			for (const value of contributionDays) {
				const day = asRecord(value);
				const weekday = asNumber(day?.weekday);
				if (weekday === undefined || weekday < 0 || weekday > 6) continue;
				days[weekday] = {
					count: asNumber(day?.contributionCount) ?? 0,
					level: levels[asString(day?.contributionLevel) ?? ""] ?? 0,
					color: asString(day?.color) ?? colors[0] ?? "#ebedf0",
					weekday,
				};
			}
			return { days };
		}),
	});
}

async function enrichGithub(url: URL, context: LinkProviderContext) {
	const username = getGithubUsername(url);
	if (!username) return {};
	const headers: HeadersInit = {
		Accept: "application/vnd.github+json",
		"User-Agent": "Grabbin Link Preview/1.0",
	};
	const token = asString(context.env?.GITHUB_TOKEN);
	if (token) headers.Authorization = `Bearer ${token}`;
	const user = asRecord(
		await fetchJson(
			`https://api.github.com/users/${encodeURIComponent(username)}`,
			context,
			{ headers },
		),
	);
	if (!user) return {};
	return {
		title: asString(user.name) ?? username,
		description: asString(user.bio),
		imageUrl: getHttpsUrl(user.avatar_url, url),
		providerData: getProviderData({
			githubUsername: username,
			followers: asNumber(user.followers),
			githubContributionGraph: await getGithubContributionGraph(
				username,
				context,
			),
		}),
	};
}

function getYoutubeTarget(url: URL) {
	if (
		![
			"youtube.com",
			"www.youtube.com",
			"m.youtube.com",
			"music.youtube.com",
			"youtu.be",
		].includes(url.hostname.toLowerCase())
	) {
		return undefined;
	}
	const segments = url.pathname
		.split("/")
		.filter(Boolean)
		.map((segment) => {
			try {
				return decodeURIComponent(segment);
			} catch {
				return segment;
			}
		});
	if (url.hostname.toLowerCase() === "youtu.be") {
		return segments.length === 1
			? { type: "video" as const, id: segments[0] }
			: undefined;
	}
	if (segments[0]?.startsWith("@") && segments.length === 1) {
		return {
			type: "channel" as const,
			id: segments[0].slice(1),
			filter: "forHandle",
		};
	}
	if (segments[0] === "channel" && segments[1] && segments.length === 2) {
		return { type: "channel" as const, id: segments[1], filter: "id" };
	}
	if (segments[0] === "user" && segments[1] && segments.length === 2) {
		return { type: "channel" as const, id: segments[1], filter: "forUsername" };
	}
	if (segments[0] === "watch") {
		const id = url.searchParams.get("v");
		return id ? { type: "video" as const, id } : undefined;
	}
	if (["shorts", "embed", "live"].includes(segments[0] ?? "") && segments[1]) {
		return { type: "video" as const, id: segments[1] };
	}
	return undefined;
}

function getYoutubeThumbnail(value: unknown) {
	const thumbnails = asRecord(value);
	for (const key of ["maxres", "standard", "high", "medium", "default"]) {
		const url = getHttpsUrl(asRecord(thumbnails?.[key])?.url);
		if (url) return url;
	}
	return undefined;
}

async function enrichYoutube(url: URL, context: LinkProviderContext) {
	const target = getYoutubeTarget(url);
	const apiKey = asString(context.env?.YOUTUBE_API_KEY);
	if (!target?.id || !apiKey) return {};
	const endpoint = new URL("https://www.googleapis.com/youtube/v3/");
	endpoint.pathname += target.type === "channel" ? "channels" : "videos";
	endpoint.searchParams.set("part", "snippet,statistics");
	endpoint.searchParams.set(
		target.type === "channel" ? target.filter : "id",
		target.id,
	);
	endpoint.searchParams.set("key", apiKey);
	const youtubePayload = asRecord(await fetchJson(endpoint, context));
	const item = asRecord(
		Array.isArray(youtubePayload?.items) ? youtubePayload.items[0] : undefined,
	);
	if (!item) return {};
	const snippet = asRecord(item.snippet);
	const statistics = asRecord(item.statistics);
	const thumbnail = getYoutubeThumbnail(snippet?.thumbnails);
	return {
		title: asString(snippet?.title),
		description: asString(snippet?.description),
		imageUrl: thumbnail,
		providerData: getProviderData({
			subscriberCount:
				target.type === "channel"
					? asNumber(statistics?.subscriberCount)
					: undefined,
			viewCount: asNumber(statistics?.viewCount),
			likeCount: asNumber(statistics?.likeCount),
			commentCount: asNumber(statistics?.commentCount),
			channelImageUrl: target.type === "channel" ? thumbnail : undefined,
		}),
	};
}

function getDiscordInviteCode(url: URL) {
	const hostname = url.hostname.toLowerCase();
	const segments = url.pathname.split("/").filter(Boolean);
	if (hostname === "discord.gg" && segments.length === 1) return segments[0];
	if (
		[
			"discord.com",
			"www.discord.com",
			"discordapp.com",
			"www.discordapp.com",
		].includes(hostname) &&
		segments[0] === "invite" &&
		segments[1] &&
		segments.length === 2
	)
		return segments[1];
	return undefined;
}

async function enrichDiscord(url: URL, context: LinkProviderContext) {
	const code = getDiscordInviteCode(url);
	if (!code) return {};
	const payload = asRecord(
		await fetchJson(
			`https://discord.com/api/v10/invites/${encodeURIComponent(code)}?with_counts=true`,
			context,
		),
	);
	const guild = asRecord(payload?.guild);
	if (!guild) return {};
	const guildId = asString(guild.id);
	const iconHash = asString(guild.icon);
	const imageUrl =
		guildId && iconHash
			? `https://cdn.discordapp.com/icons/${encodeURIComponent(guildId)}/${encodeURIComponent(iconHash)}.png?size=512`
			: undefined;
	return {
		title: asString(guild.name),
		description: asString(guild.description),
		...(imageUrl ? { imageUrl } : {}),
		providerData: getProviderData({
			guildId,
			inviteCode: code,
			memberCount: asNumber(payload?.approximate_member_count),
			onlineMemberCount: asNumber(payload?.approximate_presence_count),
		}),
	};
}

function getChzzkChannelTarget(url: URL) {
	if (url.hostname.toLowerCase() !== "chzzk.naver.com") return undefined;
	const segments = url.pathname.split("/").filter(Boolean);
	if (segments.length === 1 && /^[a-f\d]{32}$/i.test(segments[0] ?? "")) {
		return { channelId: segments[0] as string, live: false };
	}
	if (
		["live", "livechat"].includes(segments[0] ?? "") &&
		/^[a-f\d]{32}$/i.test(segments[1] ?? "")
	) {
		return { channelId: segments[1] as string, live: true };
	}
	return undefined;
}

async function fetchChzzk(
	path: string,
	context: LinkProviderContext,
	parameters: Record<string, string>,
) {
	const clientId = asString(context.env?.CHZZK_CLIENT_ID);
	const clientSecret = asString(context.env?.CHZZK_CLIENT_SECRET);
	if (!clientId || !clientSecret) return undefined;
	const endpoint = new URL(`https://openapi.chzzk.naver.com/open/v1/${path}`);
	for (const [key, value] of Object.entries(parameters))
		endpoint.searchParams.set(key, value);
	return asRecord(
		await fetchJson(endpoint, context, {
			headers: {
				Accept: "application/json",
				"Client-Id": clientId,
				"Client-Secret": clientSecret,
			},
		}),
	);
}

function getChzzkItems(payload: Record<string, unknown> | undefined) {
	for (const value of [payload?.content, payload?.data]) {
		if (Array.isArray(value)) return value.filter(isRecord);
		const record = asRecord(value);
		for (const nested of [record?.data, record?.content]) {
			if (Array.isArray(nested)) return nested.filter(isRecord);
		}
	}
	return [];
}

async function enrichChzzk(url: URL, context: LinkProviderContext) {
	const target = getChzzkChannelTarget(url);
	if (!target) return {};
	if (!target.live) {
		const channel = getChzzkItems(
			await fetchChzzk("channels", context, { channelIds: target.channelId }),
		)[0];
		if (!channel) return {};
		const channelImageUrl = getHttpsUrl(channel.channelImageUrl, url);
		return {
			title: asString(channel.channelName),
			imageUrl: channelImageUrl,
			providerData: getProviderData({
				channelId: asString(channel.channelId) ?? target.channelId,
				followerCount: asNumber(channel.followerCount),
				verifiedMark:
					typeof channel.verifiedMark === "boolean"
						? channel.verifiedMark
						: undefined,
				channelImageUrl,
			}),
		};
	}
	const live = getChzzkItems(
		await fetchChzzk("lives", context, { size: "20" }),
	).find((item) => asString(item.channelId) === target.channelId);
	if (!live) return {};
	const liveThumbnailUrl = getHttpsUrl(live.liveThumbnailImageUrl, url);
	return {
		title: asString(live.liveTitle) ?? asString(live.channelName),
		description: asString(live.liveCategoryValue),
		imageUrl: liveThumbnailUrl,
		providerData: getProviderData({
			channelId: target.channelId,
			followerCount: asNumber(live.followerCount),
			isLive: true,
			liveId: asString(live.liveId),
			liveViewerCount: asNumber(live.concurrentUserCount),
			liveThumbnailUrl,
		}),
	};
}

function getTwitchLogin(url: URL) {
	if (
		!["twitch.tv", "www.twitch.tv", "m.twitch.tv"].includes(
			url.hostname.toLowerCase(),
		)
	)
		return undefined;
	const segments = url.pathname.split("/").filter(Boolean);
	const reserved = new Set([
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
		"login",
		"signup",
	]);
	return segments.length === 1 &&
		!reserved.has(segments[0]?.toLowerCase() ?? "")
		? segments[0]
		: undefined;
}

async function getTwitchAccessToken(context: LinkProviderContext) {
	const userToken = asString(context.env?.TWITCH_USER_ACCESS_TOKEN);
	if (userToken) return userToken;
	const clientId = asString(context.env?.TWITCH_CLIENT_ID);
	const clientSecret = asString(context.env?.TWITCH_CLIENT_SECRET);
	if (!clientId || !clientSecret) return undefined;
	const endpoint = new URL("https://id.twitch.tv/oauth2/token");
	endpoint.searchParams.set("client_id", clientId);
	endpoint.searchParams.set("client_secret", clientSecret);
	endpoint.searchParams.set("grant_type", "client_credentials");
	const payload = asRecord(
		await fetchJson(endpoint, context, { method: "POST" }),
	);
	return asString(payload?.access_token);
}

async function enrichTwitch(url: URL, context: LinkProviderContext) {
	const login = getTwitchLogin(url);
	const clientId = asString(context.env?.TWITCH_CLIENT_ID);
	if (!login || !clientId) return {};
	const token = await getTwitchAccessToken(context);
	if (!token) return {};
	const headers = {
		Accept: "application/json",
		"Client-Id": clientId,
		Authorization: `Bearer ${token}`,
	};
	const userPayload = asRecord(
		await fetchJson(
			`https://api.twitch.tv/helix/users?login=${encodeURIComponent(login)}`,
			context,
			{ headers },
		),
	);
	const user = Array.isArray(userPayload?.data)
		? asRecord(userPayload.data[0])
		: undefined;
	const userId = asString(user?.id);
	if (!user || !userId) return {};
	const followersPayload = asRecord(
		await fetchJson(
			`https://api.twitch.tv/helix/channels/followers?broadcaster_id=${encodeURIComponent(userId)}`,
			context,
			{ headers },
		),
	);
	const profileImageUrl = getHttpsUrl(user.profile_image_url, url);
	return {
		title: asString(user.display_name) ?? login,
		description: asString(user.description),
		imageUrl: profileImageUrl,
		providerData: getProviderData({
			channelId: userId,
			profileImageUrl,
			followerCount: asNumber(followersPayload?.total),
		}),
	};
}

async function enrichProductHunt(url: URL, context: LinkProviderContext) {
	if (
		!["producthunt.com", "www.producthunt.com"].includes(
			url.hostname.toLowerCase(),
		)
	)
		return {};
	const slug = url.pathname.match(/^\/products\/([^/]+)\/?$/)?.[1];
	const token = asString(context.env?.PRODUCT_HUNT_TOKEN);
	if (!slug || !token) return {};
	const payload = asRecord(
		await fetchJson("https://api.producthunt.com/v2/api/graphql", context, {
			method: "POST",
			headers: {
				Accept: "application/json",
				Authorization: `Bearer ${token}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				query:
					"query ($slug: String!) { post(slug: $slug) { name tagline votesCount thumbnail { url } } }",
				variables: { slug },
			}),
		}),
	);
	const post = asRecord(asRecord(payload?.data)?.post);
	if (!post) return {};
	return {
		title: asString(post.name),
		description: asString(post.tagline),
		imageUrl: getHttpsUrl(asRecord(post.thumbnail)?.url, url),
		providerData: getProviderData({ upvoteCount: asNumber(post.votesCount) }),
	};
}

const providerEnrichers: Record<
	string,
	(url: URL, context: LinkProviderContext) => Promise<PageItemLinkMetadata>
> = {
	x: enrichX,
	instagram: enrichInstagram,
	threads: enrichThreads,
	tiktok: enrichTikTok,
	github: enrichGithub,
	youtube: enrichYoutube,
	"youtube-music": enrichYoutube,
	discord: enrichDiscord,
	chzzk: enrichChzzk,
	twitch: enrichTwitch,
	"product-hunt": enrichProductHunt,
};

export async function enrichLinkProvider(
	url: URL,
	context: LinkProviderContext,
): Promise<PageItemLinkMetadata> {
	const provider = resolveLinkProviderId(url);
	try {
		const metadata = await providerEnrichers[provider]?.(url, context);
		return { ...(metadata ?? {}), provider };
	} catch {
		return { provider };
	}
}
