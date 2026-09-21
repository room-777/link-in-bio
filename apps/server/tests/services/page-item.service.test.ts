import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { DatabaseClient } from "@grabbin/db";

import { PageItemServiceError } from "../../src/exceptions/page-item.exception";
import { persistPageItemBatch } from "../../src/services/page-item.service";

const layout = { x: 0, y: 0, w: 1, h: 2 };

describe("page item service", () => {
	/**
	 * Case ID: PAGE-ITEM-SERVICE-001
	 * Given: a batch repeats an item ID.
	 * When: persistPageItemBatch validates the batch.
	 * Then: it rejects before opening a database transaction.
	 * Evidence: PageItemServiceError.code=DUPLICATE_ITEM_ID and transaction count=0.
	 * Result: Pass | Fail | Blocked | Not Run
	 */
	it("PAGE-ITEM-SERVICE-001 rejects duplicate IDs before the transaction", async () => {
		let transactionCount = 0;
		const db = {
			transaction: async () => {
				transactionCount += 1;
				throw new Error("transaction should not run");
			},
		} as unknown as DatabaseClient;

		await assert.rejects(
			persistPageItemBatch({
				db,
				handle: "jane",
				userId: "user-1",
				batch: {
					upserts: [
						{
							id: "item-1",
							type: "text",
							data: { text: "One" },
							style: {},
							layouts: { wide: layout, compact: layout },
						},
						{
							id: "item-1",
							type: "text",
							data: { text: "Two" },
							style: {},
							layouts: { wide: layout, compact: layout },
						},
					],
					deletes: [],
				},
			}),
			(error: unknown) =>
				error instanceof PageItemServiceError &&
				error.code === "DUPLICATE_ITEM_ID",
		);
		assert.equal(transactionCount, 0);
	});

	/**
	 * Case ID: PAGE-ITEM-SERVICE-002
	 * Given: an owner submits a valid item and an empty text item.
	 * When: persistPageItemBatch saves the batch.
	 * Then: the valid item is inserted atomically and the empty item is omitted.
	 * Evidence: captured insert values and returned item response.
	 * Result: Pass | Fail | Blocked | Not Run
	 */
	it("PAGE-ITEM-SERVICE-002 persists valid items and skips empty text", async () => {
		const now = new Date("2026-09-21T00:00:00.000Z");
		const inserted: Array<Record<string, unknown>> = [];
		const savedItems: Array<Record<string, unknown>> = [];
		let findManyCount = 0;
		const itemQuery = {
			findMany: async () => {
				findManyCount += 1;
				return findManyCount < 3 ? [] : savedItems;
			},
		};
		const insertQuery = {
			values(values: Array<Record<string, unknown>>) {
				inserted.push(...values);
				return insertQuery;
			},
			onConflictDoUpdate: async () => {
				savedItems.push({
					...inserted[0],
					createdAt: now,
					updatedAt: now,
				});
			},
		};
		const tx = {
			query: {
				pages: { findFirst: async () => ({ id: "page-1" }) },
				pageItems: itemQuery,
			},
			insert: () => insertQuery,
		};
		const db = {
			transaction: async (callback: (value: typeof tx) => unknown) =>
				callback(tx),
		} as unknown as DatabaseClient;

		const result = await persistPageItemBatch({
			db,
			handle: "jane",
			userId: "user-1",
			batch: {
				upserts: [
					{
						id: "empty",
						type: "text",
						data: { text: "   " },
						style: {},
						layouts: { wide: layout, compact: layout },
					},
					{
						id: "item-1",
						type: "text",
						data: { text: "Hello" },
						style: { textAlign: "center" },
						layouts: { wide: layout, compact: layout },
					},
				],
				deletes: [],
			},
		});

		assert.equal(inserted.length, 1);
		assert.equal(inserted[0]?.id, "item-1");
		assert.equal(result.items[0]?.id, "item-1");
	});

	/**
	 * Case ID: PAGE-ITEM-SERVICE-008
	 * Given: a persisted YouTube link with provider metadata.
	 * When: the service maps the public page item response.
	 * Then: it adds the normalized provider presentation JSON.
	 * Evidence: the response contains the provider, action detail, and preview images.
	 * Result: Pass | Fail | Blocked | Not Run
	 */
	it("PAGE-ITEM-SERVICE-008 enriches link presentation data", async () => {
		const now = new Date("2026-09-21T00:00:00.000Z");
		const inserted: Array<Record<string, unknown>> = [];
		const savedItems: Array<Record<string, unknown>> = [];
		let findManyCount = 0;
		const itemQuery = {
			findMany: async () => {
				findManyCount += 1;
				return findManyCount < 3 ? [] : savedItems;
			},
		};
		const insertQuery = {
			values(values: Array<Record<string, unknown>>) {
				inserted.push(...values);
				return insertQuery;
			},
			onConflictDoUpdate: async () => {
				savedItems.push({
					...inserted[0],
					createdAt: now,
					updatedAt: now,
				});
			},
		};
		const tx = {
			query: {
				pages: { findFirst: async () => ({ id: "page-1" }) },
				pageItems: itemQuery,
			},
			insert: () => insertQuery,
		};
		const db = {
			transaction: async (callback: (value: typeof tx) => unknown) =>
				callback(tx),
		} as unknown as DatabaseClient;

		const result = await persistPageItemBatch({
			db,
			handle: "jane",
			userId: "user-1",
			batch: {
				upserts: [
					{
						id: "youtube-item",
						type: "link",
						data: {
							url: "https://www.youtube.com/@grabbin",
							metadata: {
								title: "Grabbin",
								providerData: {
									subscriberCount: 1200,
									recentVideoThumbnailUrls: [
										"https://cdn.example.com/video.png",
									],
								},
							},
						},
						style: {},
						layouts: { wide: layout, compact: layout },
					},
				],
				deletes: [],
			},
		});

		const link = result.items[0];
		assert.equal(link?.type, "link");
		if (link?.type !== "link") return;
		assert.equal(link.data.metadata?.provider, "youtube");
		assert.deepEqual(link.data.metadata?.presentation, {
			provider: "youtube",
			providerLabel: "YouTube",
			cardBackground: "#fff2f5",
			actionBackground: "#ff0033",
			actionText: "#ffffff",
			actionLabel: "Watch",
			actionVariant: "solid",
			actionDetail: "1.2K",
			imageUrls: ["https://cdn.example.com/video.png"],
		});
	});

	/**
	 * Case ID: PAGE-ITEM-SERVICE-003
	 * Given: an item ID belongs to another page.
	 * When: the current owner tries to upsert it.
	 * Then: the transaction rejects the claim.
	 * Evidence: PageItemServiceError.code=ITEM_ID_ALREADY_CLAIMED.
	 * Result: Pass | Fail | Blocked | Not Run
	 */
	it("PAGE-ITEM-SERVICE-003 rejects an item ID owned by another page", async () => {
		const tx = {
			query: {
				pages: { findFirst: async () => ({ id: "page-1" }) },
				pageItems: {
					findMany: async () => [{ id: "item-1", pageId: "page-2" }],
				},
			},
		};
		const db = {
			transaction: async (callback: (value: typeof tx) => unknown) =>
				callback(tx),
		} as unknown as DatabaseClient;

		await assert.rejects(
			persistPageItemBatch({
				db,
				handle: "jane",
				userId: "user-1",
				batch: {
					upserts: [
						{
							id: "item-1",
							type: "text",
							data: { text: "Hello" },
							style: {},
							layouts: { wide: layout, compact: layout },
						},
					],
					deletes: [],
				},
			}),
			(error: unknown) =>
				error instanceof PageItemServiceError &&
				error.code === "ITEM_ID_ALREADY_CLAIMED",
		);
	});

	/**
	 * Case ID: PAGE-ITEM-SERVICE-004
	 * Given: an existing text item is submitted with empty text.
	 * When: persistPageItemBatch receives the batch.
	 * Then: it does not update or delete the existing item.
	 * Evidence: empty response and no write method is called.
	 * Result: Pass | Fail | Blocked | Not Run
	 */
	it("PAGE-ITEM-SERVICE-004 ignores empty updates to existing text", async () => {
		const current = {
			id: "item-1",
			pageId: "page-1",
			type: "text",
			data: { text: "Existing" },
			style: {},
			layouts: { wide: layout, compact: layout },
			createdAt: new Date("2026-09-20T00:00:00.000Z"),
			updatedAt: new Date("2026-09-20T00:00:00.000Z"),
		};
		let writeCount = 0;
		const tx = {
			query: {
				pages: { findFirst: async () => ({ id: "page-1" }) },
				pageItems: { findMany: async () => [current] },
			},
			insert: () => {
				writeCount += 1;
				throw new Error("insert should not run");
			},
			delete: () => {
				writeCount += 1;
				throw new Error("delete should not run");
			},
		};
		const db = {
			transaction: async (callback: (value: typeof tx) => unknown) =>
				callback(tx),
		} as unknown as DatabaseClient;

		const result = await persistPageItemBatch({
			db,
			handle: "jane",
			userId: "user-1",
			batch: {
				upserts: [
					{
						id: "item-1",
						type: "text",
						data: { text: "   " },
						style: {},
						layouts: { wide: layout, compact: layout },
					},
				],
				deletes: [],
			},
		});

		assert.deepEqual(result, { items: [] });
		assert.equal(writeCount, 0);
	});

	/**
	 * Case ID: PAGE-ITEM-SERVICE-005
	 * Given: two items overlap in a breakpoint layout.
	 * When: persistPageItemBatch validates the final page layout.
	 * Then: it rejects the batch before writing.
	 * Evidence: PageItemServiceError.code=INVALID_ITEM_LAYOUT.
	 * Result: Pass | Fail | Blocked | Not Run
	 */
	it("PAGE-ITEM-SERVICE-005 rejects overlapping layouts", async () => {
		const tx = {
			query: {
				pages: { findFirst: async () => ({ id: "page-1" }) },
				pageItems: { findMany: async () => [] },
				pageItemUploads: { findMany: async () => [] },
			},
		};
		const db = {
			transaction: async (callback: (value: typeof tx) => unknown) =>
				callback(tx),
		} as unknown as DatabaseClient;

		await assert.rejects(
			persistPageItemBatch({
				db,
				handle: "jane",
				userId: "user-1",
				batch: {
					upserts: [
						{
							id: "item-1",
							type: "text",
							data: { text: "One" },
							style: {},
							layouts: { wide: layout, compact: layout },
						},
						{
							id: "item-2",
							type: "text",
							data: { text: "Two" },
							style: {},
							layouts: { wide: layout, compact: layout },
						},
					],
					deletes: [],
				},
			}),
			(error: unknown) =>
				error instanceof PageItemServiceError &&
				error.code === "INVALID_ITEM_LAYOUT",
		);
	});

	/**
	 * Case ID: PAGE-ITEM-SERVICE-009
	 * Given: an item uses a size that is not an allowed preset.
	 * When: persistPageItemBatch validates the item payload.
	 * Then: it rejects the batch before writing.
	 * Evidence: PageItemServiceError.code=INVALID_ITEM_LAYOUT.
	 * Result: Pass | Fail | Blocked | Not Run
	 */
	it("PAGE-ITEM-SERVICE-009 rejects a layout without an allowed preset", async () => {
		const tx = {
			query: {
				pages: { findFirst: async () => ({ id: "page-1" }) },
				pageItems: { findMany: async () => [] },
			},
		};
		const db = {
			transaction: async (callback: (value: typeof tx) => unknown) =>
				callback(tx),
		} as unknown as DatabaseClient;

		await assert.rejects(
			persistPageItemBatch({
				db,
				handle: "jane",
				userId: "user-1",
				batch: {
					upserts: [
						{
							id: "item-1",
							type: "text",
							data: { text: "Hello" },
							style: {},
							layouts: {
								wide: { x: 0, y: 0, w: 3, h: 1 },
								compact: layout,
							},
						},
					],
					deletes: [],
				},
			}),
			(error: unknown) =>
				error instanceof PageItemServiceError &&
				error.code === "INVALID_ITEM_LAYOUT",
		);
	});

	/**
	 * Case ID: PAGE-ITEM-SERVICE-006
	 * Given: a media item references a key outside the owner's item prefix.
	 * When: persistPageItemBatch validates the item.
	 * Then: it rejects the batch.
	 * Evidence: PageItemServiceError.code=INVALID_MEDIA_KEY.
	 * Result: Pass | Fail | Blocked | Not Run
	 */
	it("PAGE-ITEM-SERVICE-006 rejects media keys outside the page prefix", async () => {
		const tx = {
			query: {
				pages: { findFirst: async () => ({ id: "page-1" }) },
				pageItems: { findMany: async () => [] },
				pageItemUploads: { findMany: async () => [] },
			},
		};
		const db = {
			transaction: async (callback: (value: typeof tx) => unknown) =>
				callback(tx),
		} as unknown as DatabaseClient;

		await assert.rejects(
			persistPageItemBatch({
				db,
				handle: "jane",
				userId: "user-1",
				batch: {
					upserts: [
						{
							id: "item-1",
							type: "media",
							data: {
								objectKey: "users/user-1/pages/page-2/items/photo.png",
								mimeType: "image/png",
							},
							style: {},
							layouts: { wide: layout, compact: layout },
						},
					],
					deletes: [],
				},
			}),
			(error: unknown) =>
				error instanceof PageItemServiceError &&
				error.code === "INVALID_MEDIA_KEY",
		);
	});

	/**
	 * Case ID: PAGE-ITEM-SERVICE-010
	 * Given: an existing media item is replaced with another owned object key.
	 * When: persistPageItemBatch commits the replacement.
	 * Then: it requests cleanup only after the transaction finishes.
	 * Evidence: cleanup receives only the old object key after transaction completion.
	 * Result: Pass | Fail | Blocked | Not Run
	 */
	it("PAGE-ITEM-SERVICE-010 cleans replaced media after the transaction commits", async () => {
		const oldObjectKey = "users/user-1/pages/page-1/items/old-image.webp";
		const current = {
			id: "item-1",
			pageId: "page-1",
			type: "media",
			data: { objectKey: oldObjectKey, mimeType: "image/webp" },
			style: {},
			layouts: { wide: layout, compact: layout },
			createdAt: new Date("2026-09-20T00:00:00.000Z"),
			updatedAt: new Date("2026-09-20T00:00:00.000Z"),
		};
		let findManyCount = 0;
		const tx = {
			query: {
				pages: { findFirst: async () => ({ id: "page-1" }) },
				pageItems: {
					findMany: async () => {
						findManyCount += 1;
						if (findManyCount === 1) return [current];
						if (findManyCount === 2)
							return [{ id: "item-1", pageId: "page-1" }];
						return [
							{
								...current,
								data: {
									objectKey: "users/user-1/pages/page-1/items/new-image.webp",
									mimeType: "image/webp",
								},
								updatedAt: new Date("2026-09-21T00:00:00.000Z"),
							},
						];
					},
				},
				pageItemUploads: {
					findMany: async () => [
						{
							id: "upload-1",
							itemId: "item-1",
							objectKey: "users/user-1/pages/page-1/items/new-image.webp",
							expiresAt: new Date("2026-09-22T00:00:00.000Z"),
						},
					],
				},
			},
			insert: () => {
				const query = {
					values: () => query,
					onConflictDoUpdate: async () => undefined,
				};
				return query;
			},
			delete: () => ({ where: async () => undefined }),
		};
		let transactionFinished = false;
		const db = {
			transaction: async (callback: (value: typeof tx) => unknown) => {
				const result = await callback(tx);
				transactionFinished = true;
				return result;
			},
		} as unknown as DatabaseClient;
		const cleanedKeys: string[][] = [];

		await persistPageItemBatch({
			db,
			handle: "jane",
			userId: "user-1",
			batch: {
				upserts: [
					{
						id: "item-1",
						type: "media",
						data: {
							objectKey: "users/user-1/pages/page-1/items/new-image.webp",
							mimeType: "image/webp",
						},
						style: {},
						updatedAt: current.updatedAt.toISOString(),
						layouts: { wide: layout, compact: layout },
					},
				],
				deletes: [],
			},
			cleanupMedia: async (keys) => {
				assert.equal(transactionFinished, true);
				cleanedKeys.push([...keys]);
			},
		});

		assert.deepEqual(cleanedKeys, [[oldObjectKey]]);
	});

	/**
	 * Case ID: PAGE-ITEM-SERVICE-007
	 * Given: an existing item has a newer updatedAt than the client copy.
	 * When: the client submits the stale item.
	 * Then: the service rejects the lost update.
	 * Evidence: PageItemServiceError.code=CONCURRENT_ITEM_UPDATE.
	 * Result: Pass | Fail | Blocked | Not Run
	 */
	it("PAGE-ITEM-SERVICE-007 rejects stale item updates", async () => {
		const current = {
			id: "item-1",
			pageId: "page-1",
			type: "text",
			data: { text: "Current" },
			style: {},
			layouts: { wide: layout, compact: layout },
			createdAt: new Date("2026-09-20T00:00:00.000Z"),
			updatedAt: new Date("2026-09-21T00:00:00.000Z"),
		};
		let findManyCount = 0;
		const tx = {
			query: {
				pages: { findFirst: async () => ({ id: "page-1" }) },
				pageItems: {
					findMany: async () => {
						findManyCount += 1;
						return findManyCount === 1
							? [current]
							: [{ id: "item-1", pageId: "page-1" }];
					},
				},
			},
		};
		const db = {
			transaction: async (callback: (value: typeof tx) => unknown) =>
				callback(tx),
		} as unknown as DatabaseClient;

		await assert.rejects(
			persistPageItemBatch({
				db,
				handle: "jane",
				userId: "user-1",
				batch: {
					upserts: [
						{
							id: "item-1",
							type: "text",
							data: { text: "Stale" },
							style: {},
							updatedAt: "2026-09-20T00:00:00.000Z",
							layouts: { wide: layout, compact: layout },
						},
					],
					deletes: [],
				},
			}),
			(error: unknown) =>
				error instanceof PageItemServiceError &&
				error.code === "CONCURRENT_ITEM_UPDATE",
		);
	});
});
