import type { DatabaseClient } from "@grabbin/db";
import { pageMediaAssets } from "@grabbin/db/schema/index";
import { and, eq, inArray, sql } from "drizzle-orm";

export type PageMediaTransaction = Parameters<
	Parameters<DatabaseClient["transaction"]>[0]
>[0];

export const PAGE_MEDIA_UPLOAD_GRACE_MS = 7 * 24 * 60 * 60 * 1000;

export async function registerPendingPageMedia({
	db,
	objectKey,
	pageId,
	userId,
	uploadExpiresAt,
	now = new Date(),
}: {
	db: DatabaseClient;
	objectKey: string;
	pageId: string;
	userId: string;
	uploadExpiresAt: Date;
	now?: Date;
}) {
	await db.insert(pageMediaAssets).values({
		objectKey,
		pageId,
		userId,
		status: "pending",
		deleteAfter: new Date(now.getTime() + PAGE_MEDIA_UPLOAD_GRACE_MS),
		uploadExpiresAt,
	});
}

export async function attachPageMedia({
	tx,
	objectKeys,
	pageId,
	userId,
}: {
	tx: PageMediaTransaction;
	objectKeys: readonly string[];
	pageId: string;
	userId: string;
}) {
	const keys = [...new Set(objectKeys)];
	if (!keys.length) return true;
	const attached = await tx
		.update(pageMediaAssets)
		.set({ status: "attached", deleteAfter: null })
		.where(
			and(
				inArray(pageMediaAssets.objectKey, keys),
				eq(pageMediaAssets.pageId, pageId),
				eq(pageMediaAssets.userId, userId),
				inArray(pageMediaAssets.status, ["pending", "attached"]),
			),
		)
		.returning({ objectKey: pageMediaAssets.objectKey });
	return attached.length === keys.length;
}

export async function queuePageMediaDeletion({
	tx,
	objectKeys,
	pageId,
	userId,
	now = new Date(),
}: {
	tx: PageMediaTransaction;
	objectKeys: readonly string[];
	pageId: string;
	userId: string;
	now?: Date;
}) {
	const keys = [...new Set(objectKeys)];
	if (!keys.length) return [];
	const deleteAfter = new Date(now.getTime() + 15 * 60 * 1000);
	await tx
		.insert(pageMediaAssets)
		.values(
			keys.map((objectKey) => ({
				objectKey,
				pageId,
				userId,
				status: "pending_delete" as const,
				deleteAfter,
				uploadExpiresAt: now,
			})),
		)
		.onConflictDoUpdate({
			target: pageMediaAssets.objectKey,
			set: {
				status: "pending_delete",
				deleteAfter: sql`GREATEST(${pageMediaAssets.uploadExpiresAt}, ${deleteAfter})`,
			},
		});
	return keys;
}

export async function queueAllPageMediaDeletion({
	tx,
	pageId,
	now = new Date(),
}: {
	tx: PageMediaTransaction;
	pageId: string;
	now?: Date;
}) {
	const deleteAfter = new Date(now.getTime() + 15 * 60 * 1000);
	const rows = await tx
		.update(pageMediaAssets)
		.set({
			status: "pending_delete",
			deleteAfter: sql`GREATEST(${pageMediaAssets.uploadExpiresAt}, ${deleteAfter})`,
		})
		.where(
			and(
				eq(pageMediaAssets.pageId, pageId),
				inArray(pageMediaAssets.status, ["pending", "attached"]),
			),
		)
		.returning({ objectKey: pageMediaAssets.objectKey });
	return rows.map((row) => row.objectKey);
}

export async function cancelPendingPageMedia({
	db,
	objectKey,
	pageId,
	userId,
	now = new Date(),
}: {
	db: DatabaseClient;
	objectKey: string;
	pageId: string;
	userId: string;
	now?: Date;
}) {
	const [asset] = await db
		.update(pageMediaAssets)
		.set({
			status: "pending_delete",
			deleteAfter: sql`GREATEST(${pageMediaAssets.uploadExpiresAt}, ${new Date(now.getTime() + 15 * 60 * 1000)})`,
		})
		.where(
			and(
				eq(pageMediaAssets.objectKey, objectKey),
				eq(pageMediaAssets.pageId, pageId),
				eq(pageMediaAssets.userId, userId),
				eq(pageMediaAssets.status, "pending"),
			),
		)
		.returning({ objectKey: pageMediaAssets.objectKey });
	return Boolean(asset);
}
