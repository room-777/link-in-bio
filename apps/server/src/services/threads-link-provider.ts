import type { PageItemLinkMetadata } from "@grabbin/api";
import type {
	LinkProvider,
	LinkProviderContext,
} from "./link-providers";

const THREADS_PROFILE_TIMEOUT_MS = 8000;
const MAX_PROFILE_HTML_BYTES =
	1024 * 1024;
const THREADS_HOSTNAMES = new Set([
	"threads.com",
	"www.threads.com",
	"threads.net",
	"www.threads.net",
]);

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

function decodeHtml(
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
				) && codePoint >= 0
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

function getOgMetaContent(
	html: string,
	property: string,
): string | undefined {
	for (const match of html.matchAll(
		/<meta\b[^>]*>/gi,
	)) {
		const tag = match[0];
		if (
			getAttribute(
				tag,
				"property",
			)?.toLowerCase() !== property
		)
			continue;
		const content = getAttribute(
			tag,
			"content",
		);
		if (content)
			return decodeHtml(content);
	}
	return undefined;
}

function getOgDescription(
	html: string,
): string | undefined {
	return getOgMetaContent(
		html,
		"og:description",
	);
}

function parseFollowerCount(
	label: string,
): number | undefined {
	const normalized = label.replace(
		/\s+/g,
		"",
	);
	const match = normalized.match(
		/^([\d.,]+)([KMB])?$/i,
	);
	if (!match) return undefined;

	const raw = match[1];
	const suffix =
		match[2]?.toUpperCase();
	const number =
		suffix ||
		(raw.includes(",") &&
			!raw.includes("."))
			? Number(raw.replace(/,/g, ""))
			: Number(raw);
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
	return number * multiplier;
}

export function parseThreadsProfileMetadata(
	html: string,
): PageItemLinkMetadata {
	const description =
		getOgDescription(html);
	const followerLabel = description
		?.match(
			/([\d.,]+\s*[KMB]?)\s+Followers\b/i,
		)?.[1]
		?.trim();
	if (!followerLabel) return {};

	const followerCount =
		parseFollowerCount(followerLabel);
	if (followerCount === undefined)
		return {};

	const title = getOgMetaContent(
		html,
		"og:title",
	);
	const profileDescription =
		getOgDescription(html);
	const image = getOgMetaContent(
		html,
		"og:image",
	);
	let imageUrl: string | undefined;
	try {
		const parsedImage = image
			? new URL(image)
			: undefined;
		if (
			parsedImage?.protocol === "https:"
		)
			imageUrl = parsedImage.href;
	} catch {
		imageUrl = undefined;
	}
	return {
		...(title ? { title } : {}),
		...(profileDescription
			? {
					description:
						profileDescription,
				}
			: {}),
		...(imageUrl ? { imageUrl } : {}),
		providerData: {
			followerCount,
			followerCountLabel: followerLabel,
			followerCountApproximate:
				/[KMB]$/i.test(followerLabel),
		},
	};
}

function isThreadsProfileUrl(
	url: URL,
): boolean {
	return (
		THREADS_HOSTNAMES.has(
			url.hostname.toLowerCase(),
		) &&
		/^\/@[a-z\d._]+\/?$/i.test(
			url.pathname,
		)
	);
}

async function readProfileHtml(
	response: Response,
): Promise<string> {
	if (!response.body) return "";
	const reader =
		response.body.getReader();
	const decoder = new TextDecoder();
	let text = "";
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
				MAX_PROFILE_HTML_BYTES - total;
			const chunk =
				value.byteLength > remaining
					? value.subarray(0, remaining)
					: value;
			total += chunk.byteLength;
			text += decoder.decode(chunk, {
				stream: true,
			});
			if (/<\/head\s*>/i.test(text))
				break;
		}
	} finally {
		await reader
			.cancel()
			.catch(() => undefined);
		reader.releaseLock();
	}
	return text + decoder.decode();
}

export function createThreadsEnricher(
	fallbackEnrich: LinkProvider["enrich"],
): LinkProvider["enrich"] {
	return async (
		url: URL,
		context: LinkProviderContext,
	) => {
		if (!isThreadsProfileUrl(url))
			return fallbackEnrich(
				url,
				context,
			);

		const controller =
			new AbortController();
		const timeout = setTimeout(
			() => controller.abort(),
			THREADS_PROFILE_TIMEOUT_MS,
		);
		try {
			const profileUrl = new URL(
				`https://www.threads.com${url.pathname}`,
			);
			const response =
				await context.fetch(
					profileUrl,
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
				!response.ok ||
				!(
					response.headers.get(
						"content-type",
					) ?? "text/html"
				).includes("html")
			) {
				return fallbackEnrich(
					url,
					context,
				);
			}

			const metadata =
				parseThreadsProfileMetadata(
					await readProfileHtml(
						response,
					),
				);
			if (
				Object.keys(metadata).length ===
				0
			)
				return fallbackEnrich(
					url,
					context,
				);

			return metadata;
		} catch {
			return fallbackEnrich(
				url,
				context,
			);
		} finally {
			clearTimeout(timeout);
		}
	};
}
