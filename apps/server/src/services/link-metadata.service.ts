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
import {
	fetchHtml,
	getFaviconUrl,
	MAX_LINK_METADATA_HTML_BYTES,
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
