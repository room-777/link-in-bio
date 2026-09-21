import {
	hasPageItemContent,
	type PageItemBatchRequest,
	type PageItemResponse,
	pageItemBatchResponseSchema,
	pageItemResponseSchema,
} from "@grabbin/api";
import type { DatabaseClient } from "@grabbin/db";
import { pageItems, pages } from "@grabbin/db/schema/index";
import {
	type GridBreakpoint,
	gridColumnCounts,
	hasValidGridLayouts,
} from "@grabbin/grid-layout";
import { normalizePageHandle } from "@grabbin/page-handle";
import { resolveLinkMetadata } from "@grabbin/page-link";
import { and, eq, inArray, sql } from "drizzle-orm";
import * as v from "valibot";
import { PageItemServiceError } from "../exceptions/page-item.exception";
import {
	getPublicPageItemMediaUrl,
	isOwnedPageMediaKey,
} from "./media.service";

type PageItemLayouts = PageItemBatchRequest["upserts"][number]["layouts"];

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function mapPageItemResponse(
	item: typeof pageItems.$inferSelect,
	publicBaseUrl?: string,
): PageItemResponse {
	const data = { ...item.data };
	if (item.type === "link" && typeof data.url === "string") {
		data.metadata = resolveLinkMetadata(
			data.url,
			isRecord(data.metadata) ? data.metadata : undefined,
		);
	}
	if (item.type === "media" && typeof data.objectKey === "string") {
		const mediaUrl = getPublicPageItemMediaUrl(publicBaseUrl, data.objectKey);
		if (mediaUrl) data.mediaUrl = mediaUrl;
	}

	return v.parse(pageItemResponseSchema, {
		id: item.id,
		type: item.type,
		data,
		style: item.style,
		layouts: item.layouts,
		createdAt: item.createdAt.toISOString(),
		updatedAt: item.updatedAt.toISOString(),
	});
}

function assertUniqueBatchIds(batch: PageItemBatchRequest) {
	const upsertIds = new Set<string>();
	for (const item of batch.upserts) {
		if (upsertIds.has(item.id)) {
			throw new PageItemServiceError("DUPLICATE_ITEM_ID");
		}
		upsertIds.add(item.id);
	}

	const deleteIds = new Set(batch.deletes);
	if (deleteIds.size !== batch.deletes.length) {
		throw new PageItemServiceError("DUPLICATE_ITEM_ID");
	}
	if (batch.upserts.some((item) => deleteIds.has(item.id))) {
		throw new PageItemServiceError("CONFLICTING_ITEM_OPERATION");
	}
}

async function findOwnedPageByHandle(
	db: DatabaseClient,
	input: { handle: string; userId: string },
) {
	return db.query.pages.findFirst({
		where: and(
			eq(pages.handle, normalizePageHandle(input.handle)),
			eq(pages.userId, input.userId),
		),
		columns: { id: true },
	});
}

function assertValidItemPayload(
	item: PageItemBatchRequest["upserts"][number],
	userId: string,
	pageId: string,
) {
	if (
		item.type === "media" &&
		!isOwnedPageMediaKey({
			key: item.data.objectKey,
			userId,
			pageId,
			scope: "items",
		})
	) {
		throw new PageItemServiceError("INVALID_MEDIA_KEY");
	}
}

function assertValidPageLayouts(
	items: ReadonlyArray<{
		id: string;
		layouts: PageItemLayouts;
	}>,
) {
	for (const breakpoint of Object.keys(gridColumnCounts) as GridBreakpoint[]) {
		if (
			!hasValidGridLayouts(
				items.map((item) => ({
					id: item.id,
					layout: item.layouts[breakpoint as keyof PageItemLayouts],
				})),
				breakpoint,
			)
		) {
			throw new PageItemServiceError("INVALID_ITEM_LAYOUT");
		}
	}
}

export async function listPageItems({
	db,
	pageId,
	publicBaseUrl,
}: {
	db: DatabaseClient;
	pageId: string;
	publicBaseUrl?: string;
}) {
	const items = await db.query.pageItems.findMany({
		where: eq(pageItems.pageId, pageId),
		orderBy: (item, { asc }) => [asc(item.createdAt), asc(item.id)],
	});
	return items.map((item) => mapPageItemResponse(item, publicBaseUrl));
}

export async function persistPageItemBatch({
	db,
	handle,
	userId,
	batch,
	publicBaseUrl,
}: {
	db: DatabaseClient;
	handle: string;
	userId: string;
	batch: PageItemBatchRequest;
	publicBaseUrl?: string;
}) {
	const upserts = batch.upserts.filter(hasPageItemContent);
	const persistableBatch = { ...batch, upserts };
	assertUniqueBatchIds(persistableBatch);

	const response = await db.transaction(async (tx) => {
		const page = await findOwnedPageByHandle(tx as unknown as DatabaseClient, {
			handle,
			userId,
		});
		if (!page) throw new PageItemServiceError("PAGE_NOT_FOUND");

		const existing = await tx.query.pageItems.findMany({
			where: eq(pageItems.pageId, page.id),
			columns: { id: true, type: true, layouts: true, updatedAt: true },
		});
		const requestedIds = [
			...new Set([...upserts.map((item) => item.id), ...batch.deletes]),
		];
		if (requestedIds.length) {
			const claimedItems = await tx.query.pageItems.findMany({
				where: inArray(pageItems.id, requestedIds),
				columns: { id: true, pageId: true },
			});
			if (claimedItems.some((item) => item.pageId !== page.id)) {
				throw new PageItemServiceError("ITEM_ID_ALREADY_CLAIMED");
			}
		}

		const existingById = new Map(existing.map((item) => [item.id, item]));
		for (const id of batch.deletes) {
			if (!existingById.has(id)) {
				throw new PageItemServiceError("ITEM_NOT_FOUND");
			}
		}
		for (const item of upserts) {
			const current = existingById.get(item.id);
			if (current && current.type !== item.type) {
				throw new PageItemServiceError("ITEM_TYPE_IMMUTABLE");
			}
			if (
				current &&
				(!item.updatedAt || current.updatedAt.toISOString() !== item.updatedAt)
			) {
				throw new PageItemServiceError("CONCURRENT_ITEM_UPDATE");
			}
			assertValidItemPayload(item, userId, page.id);
		}

		const finalItems = new Map(
			existing.map((item) => [item.id, { id: item.id, layouts: item.layouts }]),
		);
		for (const id of batch.deletes) finalItems.delete(id);
		for (const item of upserts) {
			finalItems.set(item.id, { id: item.id, layouts: item.layouts });
		}
		assertValidPageLayouts([...finalItems.values()]);

		if (batch.deletes.length) {
			await tx
				.delete(pageItems)
				.where(
					and(
						eq(pageItems.pageId, page.id),
						inArray(pageItems.id, batch.deletes),
					),
				);
		}
		if (upserts.length) {
			await tx
				.insert(pageItems)
				.values(
					upserts.map((item) => ({
						id: item.id,
						pageId: page.id,
						type: item.type,
						data: item.data,
						style: item.style,
						layouts: item.layouts,
					})),
				)
				.onConflictDoUpdate({
					target: pageItems.id,
					set: {
						type: sql`excluded.type`,
						data: sql`excluded.data`,
						style: sql`excluded.style`,
						layouts: sql`excluded.layouts`,
						updatedAt: new Date(),
					},
				});
		}

		const changedIds = [
			...new Set([...batch.deletes, ...upserts.map((item) => item.id)]),
		];
		const changed = changedIds.length
			? await tx.query.pageItems.findMany({
					where: and(
						eq(pageItems.pageId, page.id),
						inArray(pageItems.id, changedIds),
					),
					orderBy: (item, { asc }) => [asc(item.createdAt), asc(item.id)],
				})
			: [];
		return { items: changed };
	});

	return v.parse(pageItemBatchResponseSchema, {
		items: response.items.map((item) =>
			mapPageItemResponse(item, publicBaseUrl),
		),
	});
}
