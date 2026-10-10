import type { PageItemLinkMetadata } from "@grabbin/api";
import type { LinkProviderContext } from "./types";

export const PROVIDER_FETCH_TIMEOUT_MS = 2500;
export const MAX_PROVIDER_HTML_BYTES = 2 * 1024 * 1024;
export const MAX_PROVIDER_JSON_BYTES = 512 * 1024;
export const MAX_LINK_METADATA_HTML_BYTES = 1024 * 1024;
export const LINK_METADATA_USER_AGENTS = [
	"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
	"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
	"Mozilla/5.0 (Windows NT 11.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
	"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
	"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
	"Mozilla/5.0 (Macintosh; Intel Mac OS X 14_2_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
	"Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
	"Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
	"Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
	"Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:121.0) Gecko/20100101 Firefox/121.0",
	"Mozilla/5.0 (X11; Linux x86_64; rv:121.0) Gecko/20100101 Firefox/121.0",
	"Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:122.0) Gecko/20100101 Firefox/122.0",
	"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15",
	"Mozilla/5.0 (Macintosh; Intel Mac OS X 14_2_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15",
	"Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1",
	"Mozilla/5.0 (iPad; CPU OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1",
	"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0",
	"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0",
	"Mozilla/5.0 (Linux; Android 14; SM-G998B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
	"Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
	"Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Mobile Safari/537.36",
	"Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1",
] as const;

function getRandomUserAgent() {
	return (
		LINK_METADATA_USER_AGENTS[
			Math.floor(Math.random() * LINK_METADATA_USER_AGENTS.length)
		] ?? LINK_METADATA_USER_AGENTS[0]
	);
}

const COUNT_MULTIPLIERS: Record<string, number> = {
	K: 1_000,
	M: 1_000_000,
	B: 1_000_000_000,
};

export function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function asRecord(value: unknown) {
	return isRecord(value) ? value : undefined;
}

export function asString(value: unknown) {
	return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export function asNumber(value: unknown) {
	const number =
		typeof value === "number"
			? value
			: typeof value === "string" && value.trim()
				? Number(value)
				: Number.NaN;
	return Number.isFinite(number) ? number : undefined;
}

export function getProviderData(values: Record<string, unknown>) {
	const defined = Object.entries(values).filter(
		([, value]) => value !== undefined,
	);
	return defined.length
		? (Object.fromEntries(defined) as PageItemLinkMetadata["providerData"])
		: undefined;
}

export function decodeHtmlEntities(value: string) {
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

export function getAttributeValue(tag: string, name: string) {
	const match = tag.match(
		new RegExp(
			`(?:^|\\s)${name}\\s*=\\s*(?:["']([^"']*)["']|([^\\s"'=<>]+))`,
			"i",
		),
	);
	return match?.[1]?.trim() || match?.[2]?.trim() || undefined;
}

export function getMetaContent(html: string, names: readonly string[]) {
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

export function getPageTitle(html: string) {
	const title = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1];
	return title
		? decodeHtmlEntities(title.replace(/<[^>]+>/g, "")).trim() || undefined
		: undefined;
}

export function limitText(value: string | undefined, maxLength: number) {
	const text = value?.trim();
	return text ? text.slice(0, maxLength) : undefined;
}

export function getHttpsUrl(value: unknown, baseUrl?: URL) {
	const rawValue = asString(value);
	if (!rawValue) return undefined;
	try {
		const url = new URL(rawValue, baseUrl);
		return url.protocol === "https:" ? url.toString() : undefined;
	} catch {
		return undefined;
	}
}

export function parseHtmlMetadata(html: string, baseUrl: URL) {
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

export function getFaviconUrl(html: string, baseUrl: URL) {
	for (const match of html.matchAll(/<link\b([^>]+)>/gi)) {
		const attributes = match[1] ?? "";
		const rel = getAttributeValue(attributes, "rel")?.toLowerCase() ?? "";
		if (!rel.split(/\s+/).some((value) => value === "icon")) continue;
		const href = getAttributeValue(attributes, "href");
		const resolved = getHttpsUrl(href, baseUrl);
		if (resolved) return resolved;
	}
	return undefined;
}

export function parseCountLabel(label: string) {
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

async function readResponseText(
	response: Response,
	maxBytes: number,
	stopAtHead = false,
) {
	const contentLength = Number(response.headers.get("content-length"));
	if (Number.isFinite(contentLength) && contentLength > maxBytes)
		return undefined;
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
			if (stopAtHead && /<\/head\s*>/i.test(text)) {
				await reader.cancel();
				break;
			}
		}
		return text + decoder.decode();
	} finally {
		reader.releaseLock();
	}
}

export async function fetchHtml(
	url: URL,
	context: LinkProviderContext,
	options?: {
		accept?: string;
		maxBytes?: number;
		stopAtHead?: boolean;
		userAgent?: string;
	},
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
				Accept: options?.accept ?? "text/html,application/xhtml+xml;q=0.9",
				"User-Agent": options?.userAgent ?? getRandomUserAgent(),
			},
		});
		if (!response.ok) return undefined;
		const contentType = response.headers.get("content-type")?.toLowerCase();
		if (contentType && !contentType.includes("html")) return undefined;
		const html = await readResponseText(
			response,
			options?.maxBytes ?? MAX_PROVIDER_HTML_BYTES,
			options?.stopAtHead ?? false,
		);
		if (html === undefined) return undefined;
		return { html, url: response.url || url.toString() };
	} catch {
		return undefined;
	} finally {
		clearTimeout(timeout);
	}
}

export async function fetchJson(
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

export function getScriptJson(html: string, id: string) {
	const escapedId = id.replace(/[^a-zA-Z0-9_-]/g, "\\$&");
	const pattern =
		"<script\\b[^>]*\\bid=[\"']" +
		escapedId +
		"[\"'][^>]*>([\\s\\S]*?)<\\/script>";
	const match = html.match(new RegExp(pattern, "i"));
	if (!match?.[1]) return undefined;
	try {
		return JSON.parse(match[1]) as unknown;
	} catch {
		return undefined;
	}
}
