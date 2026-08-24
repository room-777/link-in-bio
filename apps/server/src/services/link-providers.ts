import {
	linkProviderDefinitions,
	type PageItemLinkMetadata,
} from "@grabbin/api";
import { createChzzkEnricher } from "./chzzk-link-provider";
import { createDiscordEnricher } from "./discord-link-provider";
import { createGithubEnricher } from "./github-link-provider";
import { createInstagramEnricher } from "./instagram-link-provider";
import { createProductHuntEnricher } from "./product-hunt-link-provider";
import { createThreadsEnricher } from "./threads-link-provider";
import { createTikTokEnricher } from "./tiktok-link-provider";
import { createTwitchEnricher } from "./twitch-link-provider";
import { createXEnricher } from "./x-link-provider";
import { createYoutubeEnricher } from "./youtube-link-provider";

const LINK_FETCH_TIMEOUT_MS = 2500;
const MAX_HEAD_BYTES = 1024 * 1024;
const MAX_REDIRECTS = 3;

export type LinkProviderContext = {
	fetch: (
		input: RequestInfo | URL,
		init?: RequestInit,
	) => Promise<Response>;
	env?: LinkProviderEnvironment;
	twitchUserTokenStore?: TwitchUserTokenStore;
};

export type LinkProviderEnvironment = {
	YOUTUBE_API_KEY?: string;
	CHZZK_CLIENT_ID?: string;
	CHZZK_CLIENT_SECRET?: string;
	TWITCH_CLIENT_ID?: string;
	TWITCH_CLIENT_SECRET?: string;
	TWITCH_USER_ACCESS_TOKEN?: string;
	TWITCH_USER_REFRESH_TOKEN?: string;
	DISCORD_BOT_TOKEN?: string;
	GITHUB_TOKEN?: string;
	PRODUCT_HUNT_TOKEN?: string;
};

export type TwitchUserToken = {
	accessToken: string;
	refreshToken?: string;
	expiresAt?: number;
};

export type TwitchUserTokenStore = {
	get: () => Promise<
		TwitchUserToken | undefined
	>;
	set: (
		token: TwitchUserToken,
	) => Promise<void>;
};

export type LinkProvider = {
	id: string;
	priority: number;
	match: (url: URL) => boolean;
	enrich: (
		url: URL,
		context: LinkProviderContext,
	) => Promise<PageItemLinkMetadata>;
};

async function readHeadText(
	response: Response,
	shouldStop: (
		text: string,
	) => boolean = () => false,
): Promise<string> {
	if (!response.body) return "";
	const reader =
		response.body.getReader();
	const decoder = new TextDecoder();
	let text = "";
	let total = 0;

	try {
		for (;;) {
			const { done, value } =
				await reader.read();
			if (done) break;
			if (!value) continue;
			const remaining =
				MAX_HEAD_BYTES - total;
			const chunk =
				value.byteLength > remaining
					? value.subarray(0, remaining)
					: value;
			total += chunk.byteLength;

			text += decoder.decode(chunk, {
				stream: true,
			});
			if (shouldStop(text)) {
				await reader.cancel();
				return text;
			}
			if (/<\/head\s*>/i.test(text)) {
				await reader.cancel();
				return text;
			}
			if (
				chunk.byteLength <
				value.byteLength
			) {
				await reader.cancel();
				return text;
			}
		}
	} finally {
		reader.releaseLock();
	}

	return text + decoder.decode();
}

function hasCompleteMetadata(
	html: string,
	baseUrl: URL,
): boolean {
	const title = getPageTitle(html);
	const description =
		getMetaContent(
			html,
			"description",
		) ??
		getMetaContent(
			html,
			"og:description",
		) ??
		getMetaContent(
			html,
			"twitter:description",
		);
	const imageUrl = getFirstImageUrl(
		html,
		baseUrl,
	);
	return Boolean(
		title && description && imageUrl,
	);
}

function getAttributeValue(
	attributes: string,
	name: string,
): string | undefined {
	const match = attributes.match(
		new RegExp(
			`(?:^|\\s)${name}\\s*=\\s*(?:["']([^"']*)["']|([^\\s"'=<>]+))`,
			"i",
		),
	);
	return (
		match?.[1]?.trim() ||
		match?.[2]?.trim() ||
		undefined
	);
}

function decodeHtmlEntities(
	value: string,
): string {
	return value.replace(
		/&(?:#x([\da-f]+)|#(\d+)|amp|quot|apos|lt|gt);/gi,
		(match, hex, decimal) => {
			if (hex || decimal) {
				const codePoint =
					Number.parseInt(
						hex ?? decimal,
						hex ? 16 : 10,
					);
				return Number.isInteger(
					codePoint,
				) &&
					codePoint >= 0 &&
					codePoint <= 0x10ffff &&
					!(
						codePoint >= 0xd800 &&
						codePoint <= 0xdfff
					)
					? String.fromCodePoint(
							codePoint,
						)
					: match;
			}

			return (
				{
					amp: "&",
					quot: '"',
					apos: "'",
					lt: "<",
					gt: ">",
				}[
					match
						.slice(1, -1)
						.toLowerCase()
				] ?? match
			);
		},
	);
}

function getMetaContents(
	html: string,
	expectedProperty: string,
): string[] {
	const tagPattern =
		/<meta\b([^>]+)>/gi;
	const values: string[] = [];
	for (const match of html.matchAll(
		tagPattern,
	)) {
		const attributes = match[1] ?? "";
		const propertyValue =
			getAttributeValue(
				attributes,
				"property",
			);
		const name = getAttributeValue(
			attributes,
			"name",
		);
		if (
			propertyValue?.toLowerCase() !==
				expectedProperty.toLowerCase() &&
			name?.toLowerCase() !==
				expectedProperty.toLowerCase()
		)
			continue;
		const content = getAttributeValue(
			attributes,
			"content",
		);
		if (content) {
			values.push(
				decodeHtmlEntities(content),
			);
		}
	}
	return values;
}

function getMetaContent(
	html: string,
	expectedProperty: string,
): string | undefined {
	return getMetaContents(
		html,
		expectedProperty,
	)[0];
}

function getTitle(
	html: string,
): string | undefined {
	const title = html.match(
		/<title\b[^>]*>([\s\S]*?)<\/title>/i,
	)?.[1];
	if (!title) return undefined;
	return (
		decodeHtmlEntities(title)
			.replace(/\s+/g, " ")
			.trim() || undefined
	);
}

function getPageTitle(
	html: string,
): string | undefined {
	return (
		getTitle(html) ??
		getMetaContent(html, "og:title") ??
		getMetaContent(
			html,
			"twitter:title",
		)
	);
}

function getHttpsImageUrl(
	value: string | undefined,
	baseUrl: URL,
) {
	if (!value) return undefined;
	try {
		const imageUrl = new URL(
			value,
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

function getFirstImageUrl(
	html: string,
	baseUrl: URL,
): string | undefined {
	for (const property of [
		"og:image",
		"og:image:url",
		"og:image:secure_url",
		"twitter:image",
		"twitter:image:src",
	]) {
		for (const value of getMetaContents(
			html,
			property,
		)) {
			const imageUrl = getHttpsImageUrl(
				value,
				baseUrl,
			);
			if (imageUrl) return imageUrl;
		}
	}
	return undefined;
}

async function enrichGenericWeb(
	url: URL,
	context: LinkProviderContext,
): Promise<PageItemLinkMetadata> {
	const controller =
		new AbortController();
	const timeout = setTimeout(
		() => controller.abort(),
		LINK_FETCH_TIMEOUT_MS,
	);

	try {
		let requestUrl = url;
		let response: Response;
		for (
			let redirectCount = 0;
			;
			redirectCount += 1
		) {
			response = await context.fetch(
				requestUrl,
				{
					redirect: "manual",
					signal: controller.signal,
					headers: {
						accept:
							"text/html,application/xhtml+xml;q=0.9",
						"user-agent":
							"Mozilla/5.0 ",
					},
				},
			);

			if (
				![
					301, 302, 303, 307, 308,
				].includes(response.status) ||
				redirectCount >= MAX_REDIRECTS
			)
				break;

			const location =
				response.headers.get(
					"location",
				);
			if (!location) break;

			const redirectedUrl = new URL(
				location,
				requestUrl,
			);
			if (
				redirectedUrl.protocol !==
				"https:"
			)
				break;
			requestUrl = redirectedUrl;
		}
		if (!response.ok || !isHtmlResponse(response)) {
			return {};
		}

		const metadataBaseUrl = new URL(
			response.url || requestUrl.href,
		);
		const html = await readHeadText(
			response,
			(text) =>
				hasCompleteMetadata(
					text,
					metadataBaseUrl,
				),
		);
		return {
			title: getPageTitle(html),
			description:
				getMetaContent(
					html,
					"description",
				) ??
				getMetaContent(
					html,
					"og:description",
				) ??
				getMetaContent(
					html,
					"twitter:description",
				),
			imageUrl: getFirstImageUrl(
				html,
				metadataBaseUrl,
			),
		};
	} catch {
		return {};
	} finally {
		clearTimeout(timeout);
	}
}

function isHtmlResponse(
	response: Response,
): boolean {
	const contentType = response.headers
		.get("content-type")
		?.toLowerCase();
	if (!contentType) return true;
	return (
		contentType?.includes(
			"text/html",
		) === true ||
		contentType?.includes(
			"application/xhtml+xml",
		) === true
	);
}

const genericWebProvider: LinkProvider =
	{
		id: "generic-web",
		priority: -100,
		match: (url) =>
			url.protocol === "https:",
		enrich: enrichGenericWeb,
	};

const chzzkEnricher =
	createChzzkEnricher(enrichGenericWeb);
const discordEnricher =
	createDiscordEnricher(
		enrichGenericWeb,
	);
const twitchEnricher =
	createTwitchEnricher(
		enrichGenericWeb,
	);
const youtubeEnricher =
	createYoutubeEnricher(
		enrichGenericWeb,
	);
const threadsEnricher =
	createThreadsEnricher(
		enrichGenericWeb,
	);
const instagramEnricher =
	createInstagramEnricher(
		enrichGenericWeb,
	);
const tiktokEnricher =
	createTikTokEnricher(
		enrichGenericWeb,
	);
const xEnricher = createXEnricher(
	enrichGenericWeb,
);
const githubEnricher =
	createGithubEnricher(
		enrichGenericWeb,
	);
const productHuntEnricher =
	createProductHuntEnricher(
		enrichGenericWeb,
	);

const providerEnrichers: Readonly<
	Record<string, LinkProvider["enrich"]>
> = {
	mailto: async (url) => ({
		title: url.pathname,
	}),
	chzzk: chzzkEnricher,
	discord: discordEnricher,
	twitch: twitchEnricher,
	youtube: youtubeEnricher,
	"youtube-music": youtubeEnricher,
	threads: threadsEnricher,
	instagram: instagramEnricher,
	tiktok: tiktokEnricher,
	x: xEnricher,
	github: githubEnricher,
	"product-hunt": productHuntEnricher,
};

const sharedProviders: readonly LinkProvider[] =
	linkProviderDefinitions
		.filter(
			(definition) =>
				definition.id !== "generic-web",
		)
		.map((definition) => ({
			id: definition.id,
			priority: definition.priority,
			match: definition.match,
			enrich:
				providerEnrichers[
					definition.id
				] ?? enrichGenericWeb,
		}));

export function createLinkProviderRegistry(
	additionalProviders: readonly LinkProvider[] = [],
) {
	const providers = [
		...additionalProviders,
		...sharedProviders,
		genericWebProvider,
	].sort(
		(left, right) =>
			right.priority - left.priority,
	);

	return {
		resolve(url: URL): LinkProvider {
			return (
				providers.find((provider) =>
					provider.match(url),
				) ?? genericWebProvider
			);
		},
	};
}

export const linkProviderRegistry =
	createLinkProviderRegistry();

export function resolveLinkProvider(
	url: URL,
): LinkProvider {
	return linkProviderRegistry.resolve(
		url,
	);
}
