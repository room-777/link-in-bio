import type { AppEnv } from "@core/app-factory";
import type { DatabaseClient } from "@db/index";
import { pageItems } from "@db/schema";
import {
	hasPageItemContent,
	type PageItemBatchRequest,
	type PageItemResponse,
	type PageItemUpsert,
	pageItemBatchResponseSchema,
	pageItemResponseSchema,
} from "@grabbin/api";
import {
	getAllowedPresets,
	getPresetGeometry,
	validateLayout,
} from "@grabbin/grid-layout";
import {
	and,
	eq,
	inArray,
	sql,
} from "drizzle-orm";
import * as v from "valibot";
import { isItemMediaKey } from "../core/r2";
import {
	NotFoundError,
	UnprocessableEntityError,
} from "../exceptions/http-exceptions";
import {
	itemTypeRegistry,
	validatePageItemData,
} from "../models/item.model";
import { getPublicItemMediaUrl } from "./item-media.service";
import { prepareLinkItem } from "./link-metadata.service";
import { assertOwnedPage } from "./page.service";
import { assertPageWritable } from "./page-lifecycle.service";

export const listPageItems = async (
	db: AppEnv["Variables"]["db"],
	pageId: string,
) =>
	db.query.pageItems.findMany({
		where: eq(pageItems.pageId, pageId),
		orderBy: (item, { asc }) => [
			asc(item.createdAt),
			asc(item.id),
		],
	});

export const mapPageItemResponse = (
	item: typeof pageItems.$inferSelect,
	publicBaseUrl?: string,
	validate = true,
): PageItemResponse => {
	const data = {
		...item.data,
	} as Record<string, unknown>;
	if (
		item.type === "media" &&
		typeof data.objectKey === "string"
	) {
		const mediaUrl =
			getPublicItemMediaUrl(
				publicBaseUrl,
				data.objectKey,
			);
		if (mediaUrl)
			data.mediaUrl = mediaUrl;
	}

	const response = {
		id: item.id,
		type: item.type,
		data,
		style: item.style,
		layouts: item.layouts,
		createdAt:
			item.createdAt.toISOString(),
		updatedAt:
			item.updatedAt.toISOString(),
	};

	return validate
		? v.parse(
				pageItemResponseSchema,
				response,
			)
		: (response as PageItemResponse);
};

const assertUniqueBatchIds = (
	batch: PageItemBatchRequest,
) => {
	const ids = new Set<string>();
	for (const item of batch.upserts) {
		if (ids.has(item.id))
			throw new UnprocessableEntityError(
				"Item IDs must be unique.",
				"DUPLICATE_ITEM_ID",
			);
		ids.add(item.id);
	}
	for (const id of batch.deletes) {
		if (ids.has(id))
			throw new UnprocessableEntityError(
				"An item cannot be deleted and upserted in the same batch.",
				"CONFLICTING_ITEM_OPERATION",
			);
		ids.add(id);
	}
};

const assertItemPayload = (
	item: PageItemUpsert,
	userId: string,
	pageId: string,
) => {
	try {
		validatePageItemData(
			item.type,
			item.data,
		);
		if (
			!(item.type in itemTypeRegistry)
		)
			throw new Error(
				"Unknown item type",
			);
		for (const [
			breakpoint,
			layout,
		] of Object.entries(
			item.layouts,
		) as Array<
			[
				"wide" | "compact",
				PageItemUpsert["layouts"]["wide"],
			]
		>) {
			const cols =
				breakpoint === "wide" ? 4 : 2;
			validateLayout(
				{ [item.id]: layout },
				cols,
			);
			const presetMatches =
				getAllowedPresets(
					item.type,
				).some(
					(preset) =>
						getPresetGeometry(
							preset,
							breakpoint,
						).w === layout.w &&
						getPresetGeometry(
							preset,
							breakpoint,
						).h === layout.h,
				);
			if (!presetMatches)
				throw new Error(
					"Unsupported preset",
				);
		}
		if (
			item.type === "media" &&
			(!isItemMediaKey(
				item.data.objectKey,
			) ||
				!item.data.objectKey.startsWith(
					`users/${userId}/${pageId}/`,
				))
		)
			throw new Error(
				"Invalid media object key",
			);
	} catch {
		throw new UnprocessableEntityError(
			"Invalid item payload.",
			"INVALID_ITEM_PAYLOAD",
		);
	}
};

export const persistPageItemBatch =
	async ({
		db,
		handle,
		userId,
		batch,
		queue,
		executionCtx,
		publicBaseUrl,
	}: {
		db: DatabaseClient;
		handle: string;
		userId: string;
		batch: PageItemBatchRequest;
		queue?: Queue;
		executionCtx?: Pick<
			ExecutionContext<unknown>,
			"waitUntil"
		>;
		publicBaseUrl?: string;
	}) => {
		let upserts = batch.upserts.filter(
			hasPageItemContent,
		);
		const persistableBatch = {
			...batch,
			upserts,
		};
		assertUniqueBatchIds(
			persistableBatch,
		);
		const deletedMediaKeys: string[] =
			[];
		const response =
			await db.transaction(
				async (tx) => {
					const page =
						await assertOwnedPage(
							tx as unknown as DatabaseClient,
							handle,
							userId,
						);
					await assertPageWritable({
						db: tx as unknown as DatabaseClient,
						userId,
						page,
					});
					const existing =
						await tx.query.pageItems.findMany(
							{
								where: eq(
									pageItems.pageId,
									page.id,
								),
							},
						);
					const requestedIds = [
						...new Set(
							upserts.map(
								(item) => item.id,
							),
						),
					];
					if (requestedIds.length) {
						const claimedItems =
							await tx.query.pageItems.findMany(
								{
									where: inArray(
										pageItems.id,
										requestedIds,
									),
									columns: {
										id: true,
										pageId: true,
									},
								},
							);
						if (
							claimedItems.some(
								(item) =>
									item.pageId !==
									page.id,
							)
						)
							throw new UnprocessableEntityError(
								"Item ID is already used by another page.",
								"ITEM_ID_ALREADY_CLAIMED",
							);
					}
					const existingById = new Map(
						existing.map((item) => [
							item.id,
							item,
						]),
					);
					upserts = upserts.map(
						(item) =>
							item.type === "link"
								? prepareLinkItem(
										item,
										existingById.get(
											item.id,
										),
									)
								: item,
					);

					for (const item of upserts) {
						assertItemPayload(
							item,
							userId,
							page.id,
						);
						const current =
							existingById.get(item.id);
						if (
							current &&
							current.type !== item.type
						)
							throw new UnprocessableEntityError(
								"Item type cannot change.",
								"ITEM_TYPE_IMMUTABLE",
							);
					}
					for (const id of batch.deletes)
						if (!existingById.has(id))
							throw new NotFoundError(
								"Item",
							);

					for (const breakpoint of [
						"wide",
						"compact",
					] as const) {
						const layouts =
							Object.fromEntries(
								existing
									.filter(
										(item) =>
											!batch.deletes.includes(
												item.id,
											),
									)
									.map((item) => {
										const update =
											upserts.find(
												(candidate) =>
													candidate.id ===
													item.id,
											);
										return [
											item.id,
											update?.layouts[
												breakpoint
											] ??
												item.layouts[
													breakpoint
												],
										];
									}),
							) as Record<
								string,
								PageItemUpsert["layouts"]["wide"]
							>;
						for (const item of upserts)
							if (
								!existingById.has(
									item.id,
								)
							)
								layouts[item.id] =
									item.layouts[
										breakpoint
									];
						try {
							validateLayout(
								layouts,
								breakpoint === "wide"
									? 4
									: 2,
							);
						} catch {
							throw new UnprocessableEntityError(
								"Items may not overlap or exceed the grid.",
								"INVALID_ITEM_LAYOUT",
							);
						}
					}

					if (batch.deletes.length)
						await tx
							.delete(pageItems)
							.where(
								and(
									eq(
										pageItems.pageId,
										page.id,
									),
									inArray(
										pageItems.id,
										batch.deletes,
									),
								),
							);
					for (const item of existing.filter(
						(candidate) =>
							batch.deletes.includes(
								candidate.id,
							),
					)) {
						if (
							item.type === "media" &&
							typeof item.data
								.objectKey === "string"
						)
							deletedMediaKeys.push(
								item.data.objectKey,
							);
					}
					for (const item of upserts) {
						const current =
							existingById.get(item.id);
						if (
							current?.type ===
								"media" &&
							item.type === "media" &&
							typeof current.data
								.objectKey ===
								"string" &&
							current.data.objectKey !==
								item.data.objectKey &&
							isItemMediaKey(
								current.data.objectKey,
							) &&
							current.data.objectKey.startsWith(
								`users/${userId}/`,
							)
						)
							deletedMediaKeys.push(
								current.data.objectKey,
							);
					}
					if (upserts.length)
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

					const changedIds = [
						...new Set([
							...batch.deletes,
							...upserts.map(
								(item) => item.id,
							),
						]),
					];
					const changed =
						changedIds.length
							? await tx.query.pageItems.findMany(
									{
										where: and(
											eq(
												pageItems.pageId,
												page.id,
											),
											inArray(
												pageItems.id,
												changedIds,
											),
										),
										orderBy: (
											item,
											{ asc },
										) => [
											asc(
												item.createdAt,
											),
											asc(item.id),
										],
									},
								)
							: [];
					return { items: changed };
				},
			);

		if (
			queue &&
			executionCtx &&
			deletedMediaKeys.length
		)
			executionCtx.waitUntil(
				queue.sendBatch(
					deletedMediaKeys.map(
						(objectKey) => ({
							body: { objectKey },
						}),
					),
				),
			);

		return v.parse(
			pageItemBatchResponseSchema,
			{
				items: response.items.map(
					(item) =>
						mapPageItemResponse(
							item,
							publicBaseUrl,
						),
				),
			},
		);
	};
