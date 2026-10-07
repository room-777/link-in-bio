import type { DatabaseClient } from "@grabbin/db";
import { pageMediaAssets } from "@grabbin/db/schema/index";
import { and, eq, inArray, lte } from "drizzle-orm";

const MEDIA_CLEANUP_BATCH_SIZE = 1000;

export async function cleanupPendingPageMedia({
	db,
	bucket,
	date,
}: {
	db: DatabaseClient;
	bucket: R2Bucket;
	date: Date;
}) {
	const keys = await db.transaction(async (tx) => {
		const dueForDeletion = await tx
			.select({ objectKey: pageMediaAssets.objectKey })
			.from(pageMediaAssets)
			.where(
				and(
					eq(pageMediaAssets.status, "pending_delete"),
					lte(pageMediaAssets.deleteAfter, date),
				),
			)
			.limit(MEDIA_CLEANUP_BATCH_SIZE);
		const dueKeys = dueForDeletion.map((row) => row.objectKey);
		const pendingSlots = MEDIA_CLEANUP_BATCH_SIZE - dueKeys.length;
		let claimedKeys: string[] = [];
		if (pendingSlots > 0) {
			const expired = await tx
				.select({ objectKey: pageMediaAssets.objectKey })
				.from(pageMediaAssets)
				.where(
					and(
						eq(pageMediaAssets.status, "pending"),
						lte(pageMediaAssets.deleteAfter, date),
					),
				)
				.limit(pendingSlots);
			const expiredKeys = expired.map((row) => row.objectKey);
			if (expiredKeys.length) {
				const claimed = await tx
					.update(pageMediaAssets)
					.set({ status: "pending_delete" })
					.where(
						and(
							inArray(pageMediaAssets.objectKey, expiredKeys),
							eq(pageMediaAssets.status, "pending"),
						),
					)
					.returning({ objectKey: pageMediaAssets.objectKey });
				claimedKeys = claimed.map((row) => row.objectKey);
			}
		}
		return [...new Set([...dueKeys, ...claimedKeys])];
	});

	if (!keys.length) return { deleted: 0 };
	await bucket.delete(keys);
	await db
		.delete(pageMediaAssets)
		.where(inArray(pageMediaAssets.objectKey, keys));
	return { deleted: keys.length };
}
