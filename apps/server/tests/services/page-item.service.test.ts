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
	 * Given: an owner submits valid text and media items plus an empty text item.
	 * When: persistPageItemBatch saves the batch.
	 * Then: valid items are inserted atomically, the empty item is omitted, and the media placeholder is returned.
	 * Evidence: captured insert values and returned media response.
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
				savedItems.push(
					...inserted.map((item) => ({
						...item,
						createdAt: now,
						updatedAt: now,
					})),
				);
			},
		};
		const tx = {
			query: {
				pages: { findFirst: async () => ({ id: "page-1" }) },
				pageItems: itemQuery,
			},
			insert: () => insertQuery,
			update: () => ({
				set: () => ({
					where: () => ({
						returning: async () => [{ objectKey: "registered-key" }],
					}),
				}),
			}),
		};
		const db = {
			transaction: async (callback: (value: typeof tx) => unknown) =>
				callback(tx),
		} as unknown as DatabaseClient;

		const result = await persistPageItemBatch({
			db,
			handle: "jane",
			userId: "user-1",
			publicBaseUrl: "https://cdn.example.com",
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
					{
						id: "media-1",
						type: "media",
						data: {
							objectKey: "users/user-1/pages/page-1/items/photo.jpg",
							mimeType: "image/jpeg",
							placeholderDataUrl: "data:image/jpeg;base64,AA==",
						},
						style: {},
						layouts: {
							wide: { ...layout, x: 1 },
							compact: { ...layout, x: 1 },
						},
					},
				],
				deletes: [],
			},
		});

		assert.equal(inserted.length, 2);
		assert.equal(inserted[0]?.id, "item-1");
		assert.equal(inserted[1]?.id, "media-1");
		const insertedMedia = inserted[1];
		assert.ok(insertedMedia);
		const insertedMediaData = insertedMedia.data as Record<string, unknown>;
		assert.equal(
			insertedMediaData.placeholderDataUrl,
			"data:image/jpeg;base64,AA==",
		);
		assert.deepEqual(result.items.find((item) => item.type === "media")?.data, {
			objectKey: "users/user-1/pages/page-1/items/photo.jpg",
			mimeType: "image/jpeg",
			placeholderDataUrl: "data:image/jpeg;base64,AA==",
			mediaUrl:
				"https://cdn.example.com/users/user-1/pages/page-1/items/photo.jpg",
		});
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
							imageKey: null,
							imagePlaceholderDataUrl: "data:image/jpeg;base64,AA==",
							metadata: {
								title: "Grabbin",
								providerData: {
									subscriberCount: 1200,
									recentVideoThumbnailUrls: [
										"https://cdn.example.com/video-1.png",
										"https://cdn.example.com/video-2.png",
										"https://cdn.example.com/video-3.png",
										"https://cdn.example.com/video-4.png",
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
		assert.equal(
			link.data.imagePlaceholderDataUrl,
			"data:image/jpeg;base64,AA==",
		);
		assert.equal(link.data.metadata?.provider, "youtube");
		assert.deepEqual(link.data.metadata?.presentation, {
			provider: "youtube",
			providerLabel: "YouTube",
			faviconBackground: "#FF0033",
			cardBackground: "#fff2f5",
			actionBackground: "#ff0033",
			actionText: "#ffffff",
			actionLabel: "Watch",
			actionVariant: "solid",
			actionDetail: "1.2K",
			imageUrls: [
				"https://cdn.example.com/video-1.png",
				"https://cdn.example.com/video-2.png",
				"https://cdn.example.com/video-3.png",
				"https://cdn.example.com/video-4.png",
			],
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
	 * Given: a media or link item references a key outside its owned prefix.
	 * When: persistPageItemBatch validates the item.
	 * Then: it rejects the batch.
	 * Evidence: PageItemServiceError.code=INVALID_MEDIA_KEY.
	 * Result: Pass | Fail | Blocked | Not Run
	 */
	it("PAGE-ITEM-SERVICE-006 rejects keys outside the owned item prefix", async () => {
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

		await assert.rejects(
			persistPageItemBatch({
				db,
				handle: "jane",
				userId: "user-1",
				batch: {
					upserts: [
						{
							id: "link-1",
							type: "link",
							data: {
								url: "https://example.com",
								imageKey:
									"users/user-1/pages/page-1/items/other-link/image/photo.png",
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
	 * Then: it records the old object key as pending_delete for the cron worker.
	 * Evidence: the queue contains only the old key.
	 * Result: Pass | Fail | Blocked | Not Run
	 */
	it("PAGE-ITEM-SERVICE-010 queues replaced media for cron cleanup", async () => {
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
		let queuedKeys: string[] = [];
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
			},
			insert: () => {
				const query = {
					values: (values: { objectKey?: string; status?: string }[]) => {
						if (values.some((value) => value.status === "pending_delete"))
							queuedKeys = values.map((value) => value.objectKey ?? "");
						return query;
					},
					onConflictDoUpdate: async () => undefined,
				};
				return query;
			},
			update: () => ({
				set: () => ({
					where: () => ({
						returning: async () => [{ objectKey: "registered-key" }],
					}),
				}),
			}),
			delete: () => ({ where: async () => undefined }),
		};
		const db = {
			transaction: async (callback: (value: typeof tx) => unknown) =>
				callback(tx),
		} as unknown as DatabaseClient;

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
		});

		assert.deepEqual(queuedKeys, [oldObjectKey]);
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
