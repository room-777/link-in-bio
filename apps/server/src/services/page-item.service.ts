import {
	hasPageItemContent,
	type PageItemBatchRequest,
	type PageItemResponse,
	pageItemBatchRequestSchema,
	pageItemBatchResponseSchema,
	pageItemResponseSchema,
} from "@grabbin/api";
import {
	attachPageMedia,
	queuePageMediaDeletion,
} from "@grabbin/application/media-assets";
import {
	type BentoBreakpoint,
	bentoColumnCounts,
	hasValidBentoLayouts,
	inferPresetFromLayout,
} from "@grabbin/bento-layout";
import type { DatabaseClient } from "@grabbin/db";
import { pageItems } from "@grabbin/db/schema/index";
import { resolveLinkMetadata } from "@grabbin/page-link";
import { and, eq, inArray, sql } from "drizzle-orm";
import * as v from "valibot";
import { PageItemServiceError } from "../exceptions/page-item.exception";
import {
	getPublicPageItemMediaUrl,
	isOwnedPageLinkImageKey,
	isOwnedPageMediaKey,
} from "./media.service";
import { getOwnedPage } from "./page.service";

type PageItemLayouts = PageItemBatchRequest["upserts"][number]["layouts"];

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getPageItemMediaKey(item: { type: string; data: unknown }) {
	if (!isRecord(item.data)) return undefined;
	if (item.type === "media" && typeof item.data.objectKey === "string") {
		return item.data.objectKey;
	}
	if (item.type === "link" && typeof item.data.imageKey === "string") {
		return item.data.imageKey;
	}
	return undefined;
}

export function mapPageItemResponse(
	item: typeof pageItems.$inferSelect,
	publicBaseUrl?: string,
): PageItemResponse {
	const data = { ...item.data };
	if (item.type === "link" && typeof data.url === "string") {
		const linkMetadata = resolveLinkMetadata(
			data.url,
			isRecord(data.metadata) ? data.metadata : undefined,
		);
		const imageKey = data.imageKey;
		const imageUrl =
			typeof imageKey === "string"
				? getPublicPageItemMediaUrl(publicBaseUrl, imageKey)
				: undefined;
		const hasMultipleImages =
			(linkMetadata.presentation?.imageUrls?.length ?? 0) > 1;
		data.metadata = {
			...linkMetadata,
			presentation:
				imageKey === null && !hasMultipleImages
					? { ...linkMetadata.presentation, imageUrls: [] }
					: imageUrl
						? { ...linkMetadata.presentation, imageUrls: [imageUrl] }
						: linkMetadata.presentation,
		};
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

function assertValidItemPayload(
	item: PageItemBatchRequest["upserts"][number],
	userId: string,
	pageId: string,
) {
	for (const [breakpoint, layout] of Object.entries(item.layouts) as Array<
		[BentoBreakpoint, PageItemLayouts[BentoBreakpoint]]
	>) {
		if (!inferPresetFromLayout(item.type, layout, breakpoint)) {
			throw new PageItemServiceError("INVALID_ITEM_LAYOUT");
		}
	}

	const mediaKey = getPageItemMediaKey(item);
	if (
		mediaKey &&
		(item.type === "media"
			? !isOwnedPageMediaKey({
					key: mediaKey,
					userId,
					pageId,
					scope: "items",
				})
			: !isOwnedPageLinkImageKey({
					key: mediaKey,
					userId,
					pageId,
					itemId: item.id,
				}))
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
	for (const breakpoint of Object.keys(
		bentoColumnCounts,
	) as BentoBreakpoint[]) {
		if (
			!hasValidBentoLayouts(
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
	const parsedBatch = v.safeParse(pageItemBatchRequestSchema, batch);
	if (!parsedBatch.success) {
		throw new PageItemServiceError("INVALID_ITEM_BATCH");
	}

	const upserts = parsedBatch.output.upserts.filter(hasPageItemContent);
	const persistableBatch = { ...parsedBatch.output, upserts };
	assertUniqueBatchIds(persistableBatch);

	const response = await db.transaction(async (tx) => {
		const page = await getOwnedPage(tx as unknown as DatabaseClient, {
			handle,
			userId,
		});
		if (!page) throw new PageItemServiceError("PAGE_NOT_FOUND");

		const existing = await tx.query.pageItems.findMany({
			where: eq(pageItems.pageId, page.id),
			columns: {
				id: true,
				type: true,
				data: true,
				layouts: true,
				updatedAt: true,
			},
		});
		const requestedIds = [
			...new Set([
				...upserts.map((item) => item.id),
				...persistableBatch.deletes,
			]),
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
		for (const id of persistableBatch.deletes) {
			if (!existingById.has(id)) {
				throw new PageItemServiceError("ITEM_NOT_FOUND");
			}
		}
		for (const item of upserts) {
			const current = existingById.get(item.id);
			if (
				current &&
				item.updatedAt &&
				current.updatedAt.toISOString() !== item.updatedAt
			)
				throw new PageItemServiceError("CONCURRENT_ITEM_UPDATE");
			if (current && current.type !== item.type) {
				throw new PageItemServiceError("ITEM_TYPE_IMMUTABLE");
			}
			assertValidItemPayload(item, userId, page.id);
		}

		const finalItems = new Map(
			existing.map((item) => [
				item.id,
				{
					id: item.id,
					layouts: item.layouts,
					objectKey: getPageItemMediaKey(item),
				},
			]),
		);
		const mediaKeysToDelete = new Set<string>();
		const collectMediaKey = (item: (typeof existing)[number]) => {
			const objectKey = getPageItemMediaKey(item);
			if (
				typeof objectKey === "string" &&
				isOwnedPageMediaKey({
					key: objectKey,
					userId,
					pageId: page.id,
					scope: "items",
				})
			) {
				mediaKeysToDelete.add(objectKey);
			}
		};

		for (const id of persistableBatch.deletes) {
			const current = existingById.get(id);
			if (current) collectMediaKey(current);
		}
		for (const item of upserts) {
			const current = existingById.get(item.id);
			if (current && current.type === item.type) {
				const previousKey = getPageItemMediaKey(current);
				const nextKey = getPageItemMediaKey(item);
				if (previousKey && previousKey !== nextKey) collectMediaKey(current);
			}
		}
		for (const id of persistableBatch.deletes) finalItems.delete(id);
		for (const item of upserts) {
			finalItems.set(item.id, {
				id: item.id,
				layouts: item.layouts,
				objectKey: getPageItemMediaKey(item),
			});
		}
		assertValidPageLayouts([...finalItems.values()]);
		const finalMediaKeys = new Set(
			[...finalItems.values()].flatMap((item) =>
				typeof item.objectKey === "string" ? [item.objectKey] : [],
			),
		);
		const mediaKeysToAttach = [
			...new Set(
				upserts.flatMap((item) => {
					const objectKey = getPageItemMediaKey(item);
					return typeof objectKey === "string" ? [objectKey] : [];
				}),
			),
		];
		for (const objectKey of finalMediaKeys) mediaKeysToDelete.delete(objectKey);
		if (
			!(await attachPageMedia({
				tx,
				objectKeys: mediaKeysToAttach,
				pageId: page.id,
				userId,
			}))
		) {
			throw new PageItemServiceError("INVALID_MEDIA_KEY");
		}
		const queuedMediaKeys = await queuePageMediaDeletion({
			tx,
			objectKeys: [...mediaKeysToDelete],
			pageId: page.id,
			userId,
		});

		if (persistableBatch.deletes.length) {
			await tx
				.delete(pageItems)
				.where(
					and(
						eq(pageItems.pageId, page.id),
						inArray(pageItems.id, persistableBatch.deletes),
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
			...new Set([
				...persistableBatch.deletes,
				...upserts.map((item) => item.id),
			]),
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
		return { items: changed, mediaKeysToDelete: queuedMediaKeys };
	});

	return v.parse(pageItemBatchResponseSchema, {
		items: response.items.map((item) =>
			mapPageItemResponse(item, publicBaseUrl),
		),
	});
}
