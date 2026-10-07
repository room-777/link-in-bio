import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { R2Bucket } from "@cloudflare/workers-types";
import type { DatabaseClient } from "@grabbin/db";
import { cleanupPendingPageMedia } from "../src/jobs/media-cleanup";

describe("page media cleanup", () => {
	/** Case ID: MEDIA-GC-001
	 * Given: due pending and pending-delete assets plus an attached asset.
	 * When: the daily cleanup runs. Then: only due unreferenced objects are deleted.
	 * Evidence: R2 delete keys and remaining ledger records. Result: Pass | Fail | Blocked | Not Run
	 */
	it("MEDIA-GC-001 deletes due upload records and preserves attached media", async () => {
		const now = new Date("2026-10-07T00:00:00Z");
		const state = {
			now,
			keysToDelete: [] as string[],
			assets: [
				{
					objectKey: "users/u/pages/p/profile/abandoned.webp",
					status: "pending",
					deleteAfter: new Date("2026-10-06T00:00:00Z"),
				},
				{
					objectKey: "users/u/pages/p/items/link/image/old.webp",
					status: "pending_delete",
					deleteAfter: new Date("2026-10-06T00:00:00Z"),
				},
				{
					objectKey: "users/u/pages/p/profile/current.webp",
					status: "attached",
					deleteAfter: null,
				},
				{
					objectKey: "users/u/pages/p/items/fresh.webp",
					status: "pending",
					deleteAfter: new Date("2026-10-14T00:00:00Z"),
				},
			],
		};
		const deletedKeys: string[] = [];
		const db = createMediaCleanupDb(state);

		const result = await cleanupPendingPageMedia({
			db,
			bucket: {
				delete: async (keys: string[]) => {
					deletedKeys.push(...keys);
					state.keysToDelete = keys;
				},
			} as unknown as R2Bucket,
			now,
		});

		assert.deepEqual(deletedKeys, [
			"users/u/pages/p/items/link/image/old.webp",
			"users/u/pages/p/profile/abandoned.webp",
		]);
		assert.equal(result.deleted, 2);
		assert.deepEqual(
			state.assets.map(({ objectKey }) => objectKey),
			[
				"users/u/pages/p/profile/current.webp",
				"users/u/pages/p/items/fresh.webp",
			],
		);
	});

	/** Case ID: MEDIA-GC-002
	 * Given: a due pending-delete asset and an R2 delete failure.
	 * When: the daily cleanup runs. Then: the ledger entry remains for retry.
	 * Evidence: rejected cleanup and retained asset record. Result: Pass | Fail | Blocked | Not Run
	 */
	it("MEDIA-GC-002 retains records when R2 deletion fails", async () => {
		const state = {
			now: new Date("2026-10-07T00:00:00Z"),
			keysToDelete: [] as string[],
			assets: [
				{
					objectKey: "users/u/pages/p/profile/old.webp",
					status: "pending_delete",
					deleteAfter: new Date("2026-10-06T00:00:00Z"),
				},
			],
		};

		await assert.rejects(
			cleanupPendingPageMedia({
				db: createMediaCleanupDb(state),
				bucket: {
					delete: async () => {
						throw new Error("R2 unavailable");
					},
				} as unknown as R2Bucket,
				date: state.now,
			}),
		);
		assert.equal(state.assets[0]?.status, "pending_delete");
	});
});

function createMediaCleanupDb(state: {
	now: Date;
	keysToDelete: string[];
	assets: Array<{
		objectKey: string;
		status: string;
		deleteAfter: Date | null;
	}>;
}) {
	let selectCount = 0;
	return {
		update: () => ({
			set: (values: { status: string }) => {
				return {
					where: () => ({
						returning: async () => {
							const claimed = state.assets.filter(
								(asset) =>
									asset.status === "pending" &&
									asset.deleteAfter !== null &&
									asset.deleteAfter <= state.now,
							);
							for (const asset of claimed) asset.status = values.status;
							return claimed.map((asset) => ({
								objectKey: asset.objectKey,
							}));
						},
					}),
				};
			},
		}),
		select: () => ({
			from: () => ({
				where: () => ({
					limit: async () => {
						selectCount += 1;
						const status = selectCount === 1 ? "pending_delete" : "pending";
						return state.assets
							.filter(
								(asset) =>
									asset.status === status &&
									asset.deleteAfter !== null &&
									asset.deleteAfter <= state.now,
							)
							.map((asset) => ({ objectKey: asset.objectKey }));
					},
				}),
			}),
		}),
		delete: () => ({
			where: async () => {
				for (let i = state.assets.length - 1; i >= 0; i -= 1) {
					if (state.keysToDelete.includes(state.assets[i]?.objectKey ?? "")) {
						state.assets.splice(i, 1);
					}
				}
			},
		}),
		transaction: async (callback: (tx: unknown) => Promise<unknown>) =>
			callback(createMediaCleanupDb(state)),
	} as unknown as DatabaseClient;
}
