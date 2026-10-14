import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { normalizeProviderData, type RssFeedResponse } from "@grabbin/api";
import { getPresetGeometry } from "@grabbin/bento-layout";
import type { DatabaseClient } from "@grabbin/db";

import { PageItemServiceError } from "../../src/exceptions/page-item.exception";
import {
	listPageItems,
	persistPageItemBatch,
} from "../../src/services/page-item.service";

const layout = { x: 0, y: 0, w: 1, h: 2 };

const storedAt = new Date("2026-09-21T00:00:00.000Z");
const spotifyData = { type: "album", tracks: [] };
const rssFeed: RssFeedResponse = {
	source: {
		inputUrl: "https://example.substack.com/feed",
		pageUrl: "https://example.substack.com",
		feedUrl: "https://example.substack.com/feed",
		platform: "substack",
		type: "publication",
		iconUrl: "/api/provider-icons/substack.svg",
		title: "Example",
	},
	items: [],
};
const tweetResponse = { id_str: "20", text: "just setting up my twttr" };

/** Widget rows as the old server saved them: links marked by metadata. */
function legacyWidgetRows() {
	const row = (id: string, data: Record<string, unknown>) => ({
		id,
		pageId: "page-1",
		type: "link",
		data,
		style: {},
		layouts: { wide: layout, compact: layout },
		createdAt: storedAt,
		updatedAt: storedAt,
	});
	return [
		row("rss-default-title", {
			url: "https://example.com/feed",
			metadata: { title: "RSS Feed", provider: "rss-feed", rss: rssFeed },
		}),
		row("rss-own-title", {
			url: "https://example.com/feed",
			metadata: { title: "My blog", provider: "rss-feed" },
		}),
		row("tweet-nested", {
			url: "https://x.com/i/status/20",
			metadata: {
				provider: "tweet",
				providerData: {
					tweet: {
						authorName: "jack",
						authorProfileUrl: "https://x.com/jack",
						response: tweetResponse,
					},
				},
			},
		}),
		row("tweet-flat", {
			url: "https://x.com/i/status/20",
			metadata: {
				provider: "tweet",
				providerData: { authorName: "jack", authorProfileImageUrl: null },
			},
		}),
		row("spotify-widget", {
			url: "https://open.spotify.com/album/1",
			metadata: {
				title: "Album",
				imageUrl: "https://i.scdn.co/image/1",
				provider: "spotify",
				widget: "spotify",
				providerData: { spotify: spotifyData },
			},
		}),
		row("spotify-link", {
			url: "https://open.spotify.com/album/1",
			metadata: { title: "Album", provider: "spotify" },
		}),
	];
}

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
	 * Case ID: PAGE-ITEM-SERVICE-013
	 * Given: a free account adds a Spotify advanced widget.
	 * When: persistPageItemBatch checks the new item before saving.
	 * Then: it returns PRO_REQUIRED without writing the item.
	 * Evidence: PageItemServiceError.code=PRO_REQUIRED and no item insert.
	 * Result: Pass | Fail | Blocked | Not Run
	 */
	it("PAGE-ITEM-SERVICE-013 rejects advanced widget additions for free accounts", async () => {
		let insertCount = 0;
		const tx = {
			query: {
				pages: { findFirst: async () => ({ id: "page-1" }) },
				pageItems: { findMany: async () => [] },
				creemSubscription: { findMany: async () => [] },
			},
			insert: () => {
				insertCount += 1;
				throw new Error("insert should not run");
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
				proProductIds: ["pro-monthly"],
				batch: {
					upserts: [
						{
							id: "spotify-1",
							type: "spotify",
							data: { url: "https://open.spotify.com/track/123" },
							style: {},
							layouts: { wide: layout, compact: layout },
						},
					],
					deletes: [],
				},
			}),
			(error: unknown) =>
				error instanceof PageItemServiceError && error.code === "PRO_REQUIRED",
		);
		assert.equal(insertCount, 0);
	});

	/**
	 * Case ID: PAGE-ITEM-SERVICE-014
	 * Given: a free account adds a Spotify URL as a regular link.
	 * When: persistPageItemBatch checks whether the item is an advanced widget.
	 * Then: Spotify provider metadata alone does not require Pro.
	 * Evidence: persistence reaches the insert step instead of returning PRO_REQUIRED.
	 * Result: Pass | Fail | Blocked | Not Run
	 */
	it("PAGE-ITEM-SERVICE-014 allows Spotify URLs saved as plain links", async () => {
		const reachedInsert = new Error("insert reached");
		const tx = {
			query: {
				pages: { findFirst: async () => ({ id: "page-1" }) },
				pageItems: { findMany: async () => [] },
				creemSubscription: { findMany: async () => [] },
			},
			insert: () => {
				throw reachedInsert;
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
				proProductIds: ["pro-monthly"],
				batch: {
					upserts: [
						{
							id: "spotify-link-1",
							type: "link",
							data: {
								url: "https://open.spotify.com/track/123",
								metadata: { provider: "spotify" },
							},
							style: {},
							layouts: { wide: layout, compact: layout },
						},
					],
					deletes: [],
				},
			}),
			(error: unknown) => error === reachedInsert,
		);
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
								providerData: normalizeProviderData(
									{
										subscriberCount: 1200,
										recentVideoThumbnailUrls: [
											"https://cdn.example.com/video-1.png",
											"https://cdn.example.com/video-2.png",
											"https://cdn.example.com/video-3.png",
											"https://cdn.example.com/video-4.png",
										],
									},
									"youtube",
								),
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
		assert.equal(
			link.data.metadata?.providerData?.youtube?.subscriberCount,
			1200,
		);
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
	 * Case ID: PAGE-ITEM-SERVICE-011
	 * Given: a Tweet widget uses a preset outside its supported sizes.
	 * When: persistPageItemBatch validates the item payload.
	 * Then: it rejects the layout before writing.
	 * Evidence: PageItemServiceError.code=INVALID_ITEM_LAYOUT.
	 * Result: Pass | Fail | Blocked | Not Run
	 */
	it("PAGE-ITEM-SERVICE-011 rejects unsupported Tweet sizes", async () => {
		const tx = {
			query: {
				pages: { findFirst: async () => ({ id: "page-1" }) },
				pageItems: { findMany: async () => [] },
				creemSubscription: {
					findMany: async () => [
						{
							creemSubscriptionId: "sub-1",
							productId: "pro-monthly",
							status: "active",
							periodEnd: new Date("2099-01-01T00:00:00.000Z"),
							cancelAtPeriodEnd: false,
						},
					],
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
				proProductIds: ["pro-monthly"],
				batch: {
					upserts: [
						{
							id: "tweet-1",
							type: "tweet",
							data: { url: "https://x.com/i/status/123" },
							style: {},
							layouts: {
								wide: { x: 0, y: 0, w: 1, h: 2 },
								compact: { x: 0, y: 0, w: 1, h: 2 },
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
	 * Case ID: PAGE-ITEM-SERVICE-015
	 * Given: a Pro account saves a Tweet widget in its allowed tall sizes.
	 * When: persistPageItemBatch validates the item payload.
	 * Then: the layout passes and the batch reaches the insert step.
	 * Evidence: the insert stub is reached instead of INVALID_ITEM_LAYOUT.
	 * Result: Pass | Fail | Blocked | Not Run
	 */
	it("PAGE-ITEM-SERVICE-015 accepts the Tweet sizes", async () => {
		const reachedInsert = new Error("insert reached");
		const tx = {
			query: {
				pages: { findFirst: async () => ({ id: "page-1" }) },
				pageItems: { findMany: async () => [] },
				creemSubscription: {
					findMany: async () => [
						{
							creemSubscriptionId: "sub-1",
							productId: "pro-monthly",
							status: "active",
							periodEnd: new Date("2099-01-01T00:00:00.000Z"),
							cancelAtPeriodEnd: false,
						},
					],
				},
			},
			insert: () => {
				throw reachedInsert;
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
				proProductIds: ["pro-monthly"],
				batch: {
					upserts: [
						{
							id: "tweet-1",
							type: "tweet",
							data: { url: "https://x.com/i/status/123" },
							style: {},
							layouts: {
								wide: getPresetGeometry("squareLarge", "wide"),
								compact: getPresetGeometry("portrait", "compact"),
							},
						},
					],
					deletes: [],
				},
			}),
			(error: unknown) => error === reachedInsert,
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

	/**
	 * Case ID: PAGE-ITEM-SERVICE-016
	 * Given: the database still holds link-shaped RSS, Tweet and Spotify widget rows, and a plain Spotify link.
	 * When: listPageItems reads the page.
	 * Then: widgets come back as rss/tweet/spotify with only their widget fields; the plain Spotify link stays a link.
	 * Evidence: returned type and data per item ID.
	 * Result: Pass | Fail | Blocked | Not Run
	 */
	it("PAGE-ITEM-SERVICE-016 reads link-shaped widget rows as widget types", async () => {
		const db = {
			query: { pageItems: { findMany: async () => legacyWidgetRows() } },
		} as unknown as DatabaseClient;

		const items = await listPageItems({ db, pageId: "page-1" });
		const byId = Object.fromEntries(
			items.map((item) => [item.id, { type: item.type, data: item.data }]),
		);

		assert.deepEqual(byId["rss-default-title"], {
			type: "rss",
			data: { url: "https://example.com/feed", feed: rssFeed },
		});
		assert.deepEqual(byId["rss-own-title"], {
			type: "rss",
			data: { url: "https://example.com/feed", title: "My blog" },
		});
		assert.deepEqual(byId["tweet-nested"], {
			type: "tweet",
			data: {
				url: "https://x.com/i/status/20",
				authorName: "jack",
				authorProfileUrl: "https://x.com/jack",
				tweet: tweetResponse,
			},
		});
		assert.deepEqual(byId["tweet-flat"], {
			type: "tweet",
			data: { url: "https://x.com/i/status/20", authorName: "jack" },
		});
		assert.deepEqual(byId["spotify-widget"], {
			type: "spotify",
			data: {
				url: "https://open.spotify.com/album/1",
				title: "Album",
				imageUrl: "https://i.scdn.co/image/1",
				spotify: spotifyData,
			},
		});
		assert.equal(byId["spotify-link"]?.type, "link");
	});

	/**
	 * Case ID: PAGE-ITEM-SERVICE-017
	 * Given: a free account has a link-shaped RSS widget row saved before the rollout.
	 * When: the new editor saves that item resized, as type=rss.
	 * Then: the save passes the type, Pro and layout checks and writes the row as type=rss.
	 * Evidence: captured insert values (type and data); no PRO_REQUIRED or ITEM_TYPE_IMMUTABLE.
	 * Result: Pass | Fail | Blocked | Not Run
	 */
	it("PAGE-ITEM-SERVICE-017 saves an edited legacy widget row as its widget type", async () => {
		const [stored] = legacyWidgetRows();
		assert.ok(stored);
		const inserted: Array<Record<string, unknown>> = [];
		const squareLarge = {
			wide: getPresetGeometry("squareLarge", "wide"),
			compact: getPresetGeometry("squareLarge", "compact"),
		};
		let findManyCount = 0;
		const tx = {
			query: {
				pages: { findFirst: async () => ({ id: "page-1" }) },
				pageItems: {
					findMany: async () => {
						findManyCount += 1;
						if (findManyCount === 2)
							return [{ id: stored.id, pageId: "page-1" }];
						if (findManyCount === 3)
							return [
								{
									...stored,
									type: "rss",
									data: inserted[0]?.data,
									layouts: squareLarge,
								},
							];
						return [stored];
					},
				},
				creemSubscription: { findMany: async () => [] },
			},
			update: () => ({ set: () => ({ where: async () => [] }) }),
			insert: () => ({
				values(values: Array<Record<string, unknown>>) {
					inserted.push(...values);
					return { onConflictDoUpdate: async () => undefined };
				},
			}),
		};
		const db = {
			transaction: async (callback: (value: typeof tx) => unknown) =>
				callback(tx),
		} as unknown as DatabaseClient;

		const response = await persistPageItemBatch({
			db,
			handle: "jane",
			userId: "user-1",
			proProductIds: ["pro-monthly"],
			batch: {
				upserts: [
					{
						id: stored.id,
						type: "rss",
						data: { url: "https://example.com/feed", feed: rssFeed },
						style: {},
						layouts: squareLarge,
						updatedAt: storedAt.toISOString(),
					},
				],
				deletes: [],
			},
		});

		assert.equal(inserted.length, 1);
		assert.equal(inserted[0]?.type, "rss");
		assert.deepEqual(inserted[0]?.data, {
			url: "https://example.com/feed",
			feed: rssFeed,
		});
		assert.equal(response.items[0]?.type, "rss");
	});
});
