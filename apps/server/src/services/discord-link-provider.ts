import type { PageItemLinkMetadata } from "@grabbin/api";
import type {
	LinkProvider,
	LinkProviderContext,
} from "./link-providers";

const DISCORD_API_ORIGIN =
	"https://discord.com";
const DISCORD_API_TIMEOUT_MS = 2500;
const DISCORD_HOSTS = new Set([
	"discord.gg",
	"discord.com",
	"www.discord.com",
	"discordapp.com",
	"www.discordapp.com",
]);

type DiscordInviteResponse = {
	approximate_member_count?: unknown;
	approximate_presence_count?: unknown;
	guild?: unknown;
	channel?: unknown;
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

function getInviteCode(
	url: URL,
): string | undefined {
	const hostname =
		url.hostname.toLowerCase();
	const segments = url.pathname
		.split("/")
		.filter(Boolean);
	if (
		hostname === "discord.gg" &&
		segments.length === 1
	) {
		return decodeSegment(segments[0]);
	}
	if (
		[
			"discord.com",
			"www.discord.com",
			"discordapp.com",
			"www.discordapp.com",
		].includes(hostname) &&
		segments.length === 2 &&
		segments[0] === "invite"
	) {
		return decodeSegment(segments[1]);
	}
	return undefined;
}

function getChannelTarget(url: URL):
	| {
			guildId: string;
			channelId: string;
	  }
	| undefined {
	if (
		!DISCORD_HOSTS.has(
			url.hostname.toLowerCase(),
		)
	) {
		return undefined;
	}
	const segments = url.pathname
		.split("/")
		.filter(Boolean);
	if (
		segments.length !== 3 ||
		segments[0] !== "channels" ||
		!segments[1] ||
		!segments[2] ||
		segments[1] === "@me"
	) {
		return undefined;
	}
	return {
		guildId: segments[1],
		channelId: segments[2],
	};
}

function decodeSegment(
	value: string | undefined,
): string | undefined {
	if (!value) return undefined;
	try {
		const decoded =
			decodeURIComponent(value);
		return decoded || undefined;
	} catch {
		return undefined;
	}
}

function getDiscordImageUrl(
	guildId: string | undefined,
	imageHash: string | undefined,
	kind: "icons" | "banners",
): string | undefined {
	if (!guildId || !imageHash)
		return undefined;
	const extension =
		imageHash.startsWith("a_")
			? "gif"
			: "png";
	return `https://cdn.discordapp.com/${kind}/${encodeURIComponent(guildId)}/${encodeURIComponent(imageHash)}.${extension}?size=512`;
}

async function fetchDiscordJson<T>(
	path: string,
	context: LinkProviderContext,
	botToken?: string,
): Promise<T | undefined> {
	const controller =
		new AbortController();
	const timeout = setTimeout(
		() => controller.abort(),
		DISCORD_API_TIMEOUT_MS,
	);
	try {
		const response =
			await context.fetch(
				`${DISCORD_API_ORIGIN}/api/v10${path}`,
				{
					redirect: "manual",
					signal: controller.signal,
					headers: {
						accept: "application/json",
						...(botToken
							? {
									Authorization: `Bot ${botToken}`,
								}
							: {}),
						"user-agent":
							"Mozilla/5.0 ",
					},
				},
			);
		if (!response.ok) return undefined;
		const payload =
			(await response.json()) as unknown;
		return payload as T;
	} catch {
		return undefined;
	} finally {
		clearTimeout(timeout);
	}
}

async function enrichDiscordInvite(
	code: string,
	url: URL,
	context: LinkProviderContext,
	fallbackEnrich: LinkProvider["enrich"],
): Promise<PageItemLinkMetadata> {
	const payload =
		await fetchDiscordJson<DiscordInviteResponse>(
			`/invites/${encodeURIComponent(code)}?with_counts=true`,
			context,
		);
	const guild = asRecord(
		payload?.guild,
	);
	if (!guild)
		return fallbackEnrich(url, context);

	const guildId = asString(guild.id);
	const channel = asRecord(
		payload?.channel,
	);
	const channelId = asString(
		channel?.id,
	);
	const channelName = asString(
		channel?.name,
	);
	const memberCount = asNumber(
		payload?.approximate_member_count,
	);
	const onlineMemberCount = asNumber(
		payload?.approximate_presence_count,
	);
	const providerData =
		memberCount !== undefined ||
		onlineMemberCount !== undefined ||
		channelId ||
		channelName
			? getProviderData({
					guildId,
					channelId,
					channelName,
					memberCount,
					onlineMemberCount,
					inviteCode: code,
				})
			: undefined;
	const iconUrl = getDiscordImageUrl(
		guildId,
		asString(guild.icon),
		"icons",
	);
	const bannerUrl = getDiscordImageUrl(
		guildId,
		asString(guild.banner),
		"banners",
	);

	return {
		title: asString(guild.name),
		description: asString(
			guild.description,
		),
		imageUrl: iconUrl ?? bannerUrl,
		providerData,
	};
}

async function enrichDiscordChannel(
	target: {
		guildId: string;
		channelId: string;
	},
	url: URL,
	context: LinkProviderContext,
	fallbackEnrich: LinkProvider["enrich"],
): Promise<PageItemLinkMetadata> {
	const botToken =
		context.env?.DISCORD_BOT_TOKEN?.trim();
	if (!botToken)
		return fallbackEnrich(url, context);

	const channel = asRecord(
		await fetchDiscordJson<unknown>(
			`/channels/${encodeURIComponent(target.channelId)}`,
			context,
			botToken,
		),
	);
	const guildId =
		asString(channel?.guild_id) ??
		target.guildId;
	if (!channel || !guildId) {
		return fallbackEnrich(url, context);
	}

	const guild = asRecord(
		await fetchDiscordJson<unknown>(
			`/guilds/${encodeURIComponent(guildId)}?with_counts=true`,
			context,
			botToken,
		),
	);
	if (!guild)
		return fallbackEnrich(url, context);

	const channelId =
		asString(channel.id) ??
		target.channelId;
	const channelName = asString(
		channel.name,
	);
	const guildName = asString(
		guild.name,
	);
	const memberCount =
		asNumber(
			guild.approximate_member_count,
		) ?? asNumber(guild.member_count);
	const onlineMemberCount = asNumber(
		guild.approximate_presence_count,
	);
	const channelMemberCount = asNumber(
		channel.member_count,
	);
	const providerData = getProviderData({
		guildId,
		channelId,
		channelName,
		memberCount,
		onlineMemberCount,
		channelMemberCount,
	});
	const iconUrl = getDiscordImageUrl(
		guildId,
		asString(guild.icon),
		"icons",
	);
	const bannerUrl = getDiscordImageUrl(
		guildId,
		asString(guild.banner),
		"banners",
	);
	return {
		title:
			guildName && channelName
				? `${guildName} - ${channelName}`
				: (channelName ?? guildName),
		description:
			asString(channel.topic) ??
			asString(guild.description),
		imageUrl: iconUrl ?? bannerUrl,
		providerData,
	};
}

async function enrichDiscordRoute(
	url: URL,
	context: LinkProviderContext,
	fallbackEnrich: LinkProvider["enrich"],
): Promise<PageItemLinkMetadata> {
	const code = getInviteCode(url);
	if (code) {
		return enrichDiscordInvite(
			code,
			url,
			context,
			fallbackEnrich,
		);
	}

	const channelTarget =
		getChannelTarget(url);
	if (channelTarget) {
		return enrichDiscordChannel(
			channelTarget,
			url,
			context,
			fallbackEnrich,
		);
	}

	return fallbackEnrich(url, context);
}

export function createDiscordEnricher(
	fallbackEnrich: LinkProvider["enrich"],
): LinkProvider["enrich"] {
	return (url, context) =>
		enrichDiscordRoute(
			url,
			context,
			fallbackEnrich,
		);
}
