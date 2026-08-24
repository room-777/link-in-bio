import type { PageItemLinkMetadata } from "@grabbin/api";
import type { LinkProviderContext } from "./link-providers";

const PROFILE_FETCH_TIMEOUT_MS = 2500;
const MAX_PROFILE_HTML_BYTES =
	2 * 1024 * 1024;

function getAttribute(
	tag: string,
	name: string,
): string | undefined {
	const match = tag.match(
		new RegExp(
			`(?:^|\\s)${name}\\s*=\\s*(?:["']([^"']*)["']|([^\\s"'=<>]+))`,
			"i",
		),
	);
	return (
		(
			match?.[1] ?? match?.[2]
		)?.trim() || undefined
	);
}

export function decodeSocialHtml(
	value: string,
): string {
	return value.replace(
		/&(?:#x([\da-f]+)|#(\d+)|amp|quot|apos|lt|gt);/gi,
		(
			match,
			hex: string | undefined,
			decimal: string | undefined,
		) => {
			if (hex || decimal) {
				const codePoint =
					Number.parseInt(
						hex ?? decimal ?? "",
						hex ? 16 : 10,
					);
				return Number.isInteger(
					codePoint,
				) &&
					codePoint >= 0 &&
					codePoint <= 0x10ffff
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

export function getSocialMetaContent(
	html: string,
	property: string,
): string | undefined {
	for (const match of html.matchAll(
		/<meta\b[^>]*>/gi,
	)) {
		const tag = match[0];
		const tagProperty =
			getAttribute(tag, "property") ??
			getAttribute(tag, "name");
		if (
			tagProperty?.toLowerCase() !==
			property.toLowerCase()
		)
			continue;
		const content = getAttribute(
			tag,
			"content",
		);
		if (content)
			return decodeSocialHtml(content);
	}
	return undefined;
}

function getHttpsUrl(
	value: string | undefined,
): string | undefined {
	if (!value) return undefined;
	try {
		const url = new URL(value);
		return url.protocol === "https:"
			? url.href
			: undefined;
	} catch {
		return undefined;
	}
}

export function parseSocialProfileMetadata(
	html: string,
): PageItemLinkMetadata {
	const title = getSocialMetaContent(
		html,
		"og:title",
	);
	const description =
		getSocialMetaContent(
			html,
			"og:description",
		) ??
		getSocialMetaContent(
			html,
			"description",
		) ??
		getSocialMetaContent(
			html,
			"twitter:description",
		);
	const imageUrl = getHttpsUrl(
		getSocialMetaContent(
			html,
			"og:image",
		) ??
			getSocialMetaContent(
				html,
				"twitter:image",
			),
	);
	return {
		...(title ? { title } : {}),
		...(description
			? { description }
			: {}),
		...(imageUrl ? { imageUrl } : {}),
	};
}

export function parseFollowerCountLabel(
	label: string,
):
	| {
			followerCount: number;
			followerCountLabel: string;
			followerCountApproximate: boolean;
	  }
	| undefined {
	const normalized = label
		.trim()
		.replace(/\s+/g, "");
	const match = normalized.match(
		/^([\d.,]+)([KMB])?$/i,
	);
	if (!match) return undefined;

	const raw = match[1];
	const suffix =
		match[2]?.toUpperCase();
	const number = Number(
		raw.replace(/,/g, ""),
	);
	if (!Number.isFinite(number))
		return undefined;

	const multiplier =
		suffix === "K"
			? 1_000
			: suffix === "M"
				? 1_000_000
				: suffix === "B"
					? 1_000_000_000
					: 1;
	return {
		followerCount: number * multiplier,
		followerCountLabel: normalized,
		followerCountApproximate:
			Boolean(suffix),
	};
}

export async function fetchSocialProfileHtml(
	url: URL,
	context: LinkProviderContext,
	options?: {
		readFullDocument?: boolean;
		userAgent?: string;
		redirect?: RequestRedirect;
	},
): Promise<string | undefined> {
	const controller =
		new AbortController();
	const timeout = setTimeout(
		() => controller.abort(),
		PROFILE_FETCH_TIMEOUT_MS,
	);
	try {
		const response =
			await context.fetch(url, {
				redirect:
					options?.redirect ?? "manual",
				signal: controller.signal,
				headers: {
					accept:
						"text/html,application/xhtml+xml;q=0.9",
					"user-agent":
						options?.userAgent ??
						"Mozilla/5.0 ",
				},
			});
		if (
			!response.ok ||
			!(
				response.headers.get(
					"content-type",
				) ?? "text/html"
			).includes("html")
		) {
			return undefined;
		}
		if (!response.body) return "";

		const reader =
			response.body.getReader();
		const decoder = new TextDecoder();
		let html = "";
		let total = 0;
		try {
			while (
				total < MAX_PROFILE_HTML_BYTES
			) {
				const { done, value } =
					await reader.read();
				if (done) break;
				if (!value) continue;
				const remaining =
					MAX_PROFILE_HTML_BYTES -
					total;
				const chunk =
					value.byteLength > remaining
						? value.subarray(
								0,
								remaining,
							)
						: value;
				total += chunk.byteLength;
				html += decoder.decode(chunk, {
					stream: true,
				});
				if (
					!options?.readFullDocument &&
					/<\/head\s*>/i.test(html)
				)
					break;
			}
		} finally {
			await reader
				.cancel()
				.catch(() => undefined);
			reader.releaseLock();
		}
		return html + decoder.decode();
	} catch {
		return undefined;
	} finally {
		clearTimeout(timeout);
	}
}

export function isSocialProfilePath(
	pathname: string,
	pattern: RegExp,
): boolean {
	return pattern.test(pathname);
}
