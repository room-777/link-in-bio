import {
	type PageItemResponse,
	pageItemLinkDataSchema,
	pageItemLinkUrlSchema,
} from "@grabbin/api";
import type { DatabaseClient } from "@grabbin/db";
import { pageItems } from "@grabbin/db/schema/index";
import { and, eq } from "drizzle-orm";
import * as v from "valibot";

import { PageItemServiceError } from "../exceptions/page-item.exception";
import {
	enrichLinkProvider,
	type LinkProviderEnvironment,
} from "./link-providers";
import { getOwnedPage } from "./page.service";
import { mapPageItemResponse } from "./page-item.service";

const LINK_FETCH_TIMEOUT_MS = 2500;
const MAX_HTML_BYTES = 1024 * 1024;
const MAX_TITLE_LENGTH = 240;
const MAX_DESCRIPTION_LENGTH = 1200;

type LinkMetadata = NonNullable<
	v.InferOutput<typeof pageItemLinkDataSchema>["metadata"]
>;
type LinkMetadataFetch = (
	input: RequestInfo | URL,
	init?: RequestInit,
) => Promise<Response>;

function getAttributeValue(attributes: string, name: string) {
	const match = attributes.match(
		new RegExp(
			`(?:^|\\s)${name}\\s*=\\s*(?:["']([^"']*)["']|([^\\s"'=<>]+))`,
			"i",
		),
	);
	return match?.[1]?.trim() || match?.[2]?.trim() || undefined;
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

function getTitle(html: string) {
	const match = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);
	const title = match?.[1]?.replace(/<[^>]+>/g, "").trim();
	return title ? decodeHtmlEntities(title) : undefined;
}

function getFaviconUrl(html: string, baseUrl: URL) {
	for (const match of html.matchAll(/<link\b([^>]+)>/gi)) {
		const attributes = match[1] ?? "";
		const rel = getAttributeValue(attributes, "rel")?.toLowerCase() ?? "";
		if (!rel.split(/\s+/).some((value) => value === "icon")) continue;
		const href = getAttributeValue(attributes, "href");
		const resolved = resolveHttpsUrl(href, baseUrl);
		if (resolved) return resolved;
	}
	return undefined;
}

function limitText(value: string | undefined, maxLength: number) {
	const text = value?.trim();
	return text ? text.slice(0, maxLength) : undefined;
}

function resolveHttpsUrl(value: string | undefined, baseUrl: URL) {
	if (!value) return undefined;
	try {
		const resolved = new URL(value, baseUrl);
		return resolved.protocol === "https:" ? resolved.toString() : undefined;
	} catch {
		return undefined;
	}
}

async function readHtml(response: Response) {
	const contentLength = Number(response.headers.get("content-length"));
	if (Number.isFinite(contentLength) && contentLength > MAX_HTML_BYTES)
		return "";
	if (!response.body) return "";

	const reader = response.body.getReader();
	const decoder = new TextDecoder();
	let total = 0;
	let html = "";
	try {
		for (;;) {
			const { done, value } = await reader.read();
			if (done) break;
			if (!value) continue;
			if (total + value.byteLength > MAX_HTML_BYTES) {
				await reader.cancel();
				return "";
			}
			total += value.byteLength;
			html += decoder.decode(value, { stream: true });
			if (/<\/head\s*>/i.test(html)) {
				await reader.cancel();
				break;
			}
		}
		return html + decoder.decode();
	} finally {
		reader.releaseLock();
	}
}

async function fetchLinkMetadata(
	url: string,
	fetchFn: LinkMetadataFetch,
): Promise<LinkMetadata> {
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), LINK_FETCH_TIMEOUT_MS);
	try {
		const response = await fetchFn(url, {
			redirect: "follow",
			signal: controller.signal,
			headers: {
				Accept: "text/html,application/xhtml+xml",
				"User-Agent": "Grabbin Link Preview/1.0",
			},
		});
		if (!response.ok) return {};
		const contentType = response.headers.get("content-type")?.toLowerCase();
		if (contentType && !contentType.includes("text/html")) return {};
		const html = await readHtml(response);
		const baseUrl = new URL(response.url || url);
		const title = limitText(
			getMetaContent(html, ["og:title", "twitter:title"]) ?? getTitle(html),
			MAX_TITLE_LENGTH,
		);
		const description = limitText(
			getMetaContent(html, [
				"description",
				"og:description",
				"twitter:description",
			]),
			MAX_DESCRIPTION_LENGTH,
		);
		const imageUrl = resolveHttpsUrl(
			getMetaContent(html, ["og:image", "twitter:image"]),
			baseUrl,
		);
		const faviconUrl = getFaviconUrl(html, baseUrl);
		return {
			...(title ? { title } : {}),
			...(description ? { description } : {}),
			...(imageUrl ? { imageUrl } : {}),
			...(faviconUrl ? { faviconUrl } : {}),
		};
	} catch {
		return {};
	} finally {
		clearTimeout(timeout);
	}
}

function mergeMetadata(current: LinkMetadata | undefined, next: LinkMetadata) {
	const previous =
		current?.provider && next.provider && current.provider !== next.provider
			? Object.fromEntries(
					Object.entries(current).filter(([key]) => key !== "providerData"),
				)
			: current;
	return Object.fromEntries(
		Object.entries({
			...(previous ?? {}),
			...next,
		}).filter(([, value]) => value !== undefined),
	) as LinkMetadata;
}

export async function enrichPageItemMetadata({
	db,
	handle,
	userId,
	itemId,
	url,
	publicBaseUrl,
	fetch: fetchFn,
	env,
}: {
	db: DatabaseClient;
	handle: string;
	userId: string;
	itemId: string;
	url: string;
	publicBaseUrl?: string;
	fetch: LinkMetadataFetch;
	env?: LinkProviderEnvironment;
}): Promise<PageItemResponse> {
	const parsedUrl = v.safeParse(pageItemLinkUrlSchema, url);
	if (!parsedUrl.success)
		throw new PageItemServiceError("INVALID_LINK_METADATA");

	const page = await getOwnedPage(db, { handle, userId });
	if (!page) throw new PageItemServiceError("PAGE_NOT_FOUND");

	const current = await db.query.pageItems.findFirst({
		where: and(eq(pageItems.id, itemId), eq(pageItems.pageId, page.id)),
	});
	if (!current) throw new PageItemServiceError("ITEM_NOT_FOUND");
	if (current.type !== "link") throw new PageItemServiceError("ITEM_NOT_LINK");

	const currentData = v.parse(pageItemLinkDataSchema, current.data);
	if (currentData.url !== parsedUrl.output) {
		throw new PageItemServiceError("STALE_LINK_METADATA");
	}

	const [fetchedMetadata, providerMetadata] = await Promise.all([
		fetchLinkMetadata(parsedUrl.output, fetchFn),
		enrichLinkProvider(new URL(parsedUrl.output), { fetch: fetchFn, env }),
	]);
	const mergedMetadata = mergeMetadata(currentData.metadata, {
		...fetchedMetadata,
		...providerMetadata,
	});
	const nextData = {
		...currentData,
		...(Object.keys(mergedMetadata).length ? { metadata: mergedMetadata } : {}),
	};
	if (JSON.stringify(nextData) !== JSON.stringify(current.data)) {
		await db
			.update(pageItems)
			.set({ data: nextData, updatedAt: new Date() })
			.where(and(eq(pageItems.id, itemId), eq(pageItems.pageId, page.id)));
	}

	const updated = await db.query.pageItems.findFirst({
		where: and(eq(pageItems.id, itemId), eq(pageItems.pageId, page.id)),
	});
	if (!updated) throw new PageItemServiceError("ITEM_NOT_FOUND");
	return mapPageItemResponse(updated, publicBaseUrl);
}
