import {
	normalizeProviderData,
	type PageItemResponse,
	pageItemLinkDataSchema,
	pageItemLinkUrlSchema,
} from "@grabbin/api";
import type { DatabaseClient } from "@grabbin/db";
import { and, eq } from "@grabbin/db/drizzle";
import { pageItems } from "@grabbin/db/schema/index";
import { resolveLinkProvider } from "@grabbin/page-link";
import * as v from "valibot";

import { PageItemServiceError } from "../exceptions/page-item.exception";
import {
	enrichLinkProvider,
	type LinkProviderEnvironment,
} from "./link-providers";
import {
	fetchHtml,
	getFaviconUrl,
	getProviderData,
	MAX_LINK_METADATA_HTML_BYTES,
	parseCountLabel,
	parseHtmlMetadata,
} from "./link-providers/runtime";
import { getOwnedPage } from "./page.service";
import { mapPageItemResponse } from "./page-item.service";

type LinkMetadata = NonNullable<
	v.InferOutput<typeof pageItemLinkDataSchema>["metadata"]
>;
type LinkMetadataFetch = (
	input: RequestInfo | URL,
	init?: RequestInit,
) => Promise<Response>;

function readRetryAfter(response: Response) {
	const value = response.headers.get("retry-after")?.trim();
	if (!value || value.length > 128) return undefined;
	return /^\d+$/.test(value) || !Number.isNaN(Date.parse(value))
		? value
		: undefined;
}

function createMetadataFetch(fetchFn: LinkMetadataFetch) {
	const inFlight = new Map<string, Promise<Response>>();
	let upstreamRateLimited = false;
	let retryAfter: string | undefined;
	const fetch: LinkMetadataFetch = async (input, init) => {
		const method = (
			init?.method ?? (input instanceof Request ? input.method : "GET")
		).toUpperCase();
		let key: string | undefined;
		if (method === "GET") {
			const url = new URL(
				input instanceof Request ? input.url : input.toString(),
			);
			url.hash = "";
			key = url.href;
		}
		const existing = key ? inFlight.get(key) : undefined;
		if (existing) return (await existing).clone();

		const pending = fetchFn(input, init).then((response) => {
			if (response.status === 429) {
				upstreamRateLimited = true;
				retryAfter ??= readRetryAfter(response);
			}
			return response;
		});
		if (key) inFlight.set(key, pending);
		try {
			return await pending;
		} finally {
			if (key && inFlight.get(key) === pending) inFlight.delete(key);
		}
	};
	return {
		fetch,
		getRateLimit: () => ({ upstreamRateLimited, retryAfter }),
	};
}

async function fetchLinkMetadata(
	url: string,
	fetchFn: LinkMetadataFetch,
): Promise<LinkMetadata> {
	const document = await fetchHtml(
		new URL(url),
		{ fetch: fetchFn },
		{
			accept: "text/html,application/xhtml+xml",
			maxBytes: MAX_LINK_METADATA_HTML_BYTES,
			stopAtHead: true,
		},
	);
	if (!document) return {};
	const baseUrl = new URL(document.url);
	const metadata = parseHtmlMetadata(document.html, baseUrl);
	const faviconUrl = getFaviconUrl(document.html, baseUrl);
	return {
		...metadata,
		...(faviconUrl ? { faviconUrl } : {}),
	};
}

function mergeMetadata(current: LinkMetadata | undefined, next: LinkMetadata) {
	const previous =
		current?.provider && next.provider && current.provider !== next.provider
			? Object.fromEntries(
					Object.entries(current).filter(([key]) => key !== "providerData"),
				)
			: current;
	const merged = Object.fromEntries(
		Object.entries({
			...(previous ?? {}),
			...next,
		}).filter(([, value]) => value !== undefined),
	) as LinkMetadata;
	if (merged.providerData) {
		merged.providerData = normalizeProviderData(merged.providerData);
	}
	return merged;
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

	const metadataFetch = createMetadataFetch(fetchFn);
	const providerId = resolveLinkProvider(new URL(parsedUrl.output)).id;
	const fetchedMetadataPromise: Promise<LinkMetadata> =
		providerId === "instagram" || providerId === "discord"
			? Promise.resolve({})
			: fetchLinkMetadata(parsedUrl.output, metadataFetch.fetch);
	const [fetchedMetadata, providerMetadata] = await Promise.all([
		fetchedMetadataPromise,
		enrichLinkProvider(new URL(parsedUrl.output), {
			fetch: metadataFetch.fetch,
			fetchOptional: fetchFn,
			env,
		}),
	]);
	if (providerId === "facebook" || providerId === "linkedin") {
		const followerLabel = fetchedMetadata.description?.match(
			/([\d,.]+\s*[KMB]?)\s+followers?\b/i,
		)?.[1];
		const followerData = followerLabel
			? parseCountLabel(followerLabel)
			: undefined;
		if (followerData) {
			const talkingAboutLabel =
				providerId === "facebook"
					? fetchedMetadata.description?.match(
							/([\d,.]+\s*[KMB]?)\s+talking about this\b/i,
						)?.[1]
					: undefined;
			const talkingAboutCount = talkingAboutLabel
				? parseCountLabel(talkingAboutLabel)?.followerCount
				: undefined;
			fetchedMetadata.providerData = getProviderData({
				...followerData,
				talkingAboutCount,
			});
		}
	}
	fetchedMetadata.providerData = normalizeProviderData({
		...(fetchedMetadata.providerData ?? {}),
		...Object.fromEntries(
			Object.entries(providerMetadata.providerData ?? {}).filter(
				([, value]) => value !== null,
			),
		),
	});
	const rateLimit = metadataFetch.getRateLimit();
	if (
		rateLimit.upstreamRateLimited &&
		!Object.keys(providerMetadata).some(
			(key) => key !== "provider" && key !== "providerData",
		) &&
		!Object.values(providerMetadata.providerData ?? {}).some(
			(value) => value !== null,
		)
	) {
		throw new PageItemServiceError(
			"UPSTREAM_RATE_LIMITED",
			rateLimit.retryAfter,
		);
	}
	const mergedMetadata = mergeMetadata(currentData.metadata, {
		...fetchedMetadata,
		...providerMetadata,
		providerData: fetchedMetadata.providerData,
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
