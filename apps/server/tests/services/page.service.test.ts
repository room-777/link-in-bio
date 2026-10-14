import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { R2Bucket } from "@cloudflare/workers-types";
import type { DatabaseClient } from "@grabbin/db";
import { pageMediaAssets } from "@grabbin/db/schema/index";

import {
	completePage,
	createPage,
	getOwnedPage,
	getPublicPageWithPlan,
	updatePageDraft,
	updatePageHandle,
} from "../../src/services/page.service";

function withFreePlan(input: unknown): DatabaseClient {
	const mock = input as { query?: Record<string, unknown> };
	mock.query = {
		...mock.query,
		creemSubscription: { findMany: async () => [] },
	};
	const writable = mock as typeof mock & Record<string, unknown>;
	if (!writable.transaction) {
		writable.transaction = async (
			callback: (tx: Record<string, unknown>) => Promise<unknown>,
		) =>
			callback({
				query: mock.query,
				update: (table: unknown) =>
					table === pageMediaAssets
						? {
								set: () => ({
									where: () => ({
										returning: async () => [{ objectKey: "registered-key" }],
									}),
								}),
							}
						: (input as { update?: () => unknown }).update?.(),
				insert: () => ({
					values: () => ({
						onConflictDoUpdate: async () => undefined,
					}),
				}),
			});
	}
	if (!writable.delete) {
		writable.delete = () => ({ where: async () => undefined });
	}
	return mock as DatabaseClient;
}

describe("page service", () => {
	/**
	 * Case ID: PAGE-SERVICE-013
	 * Given: a public page has an active Pro subscription.
	 * When: the public page and plan are loaded together.
	 * Then: the result marks Pro access using one DB query.
	 * Evidence: hasProAccess=true and select was called once.
	 * Result: Pass | Fail | Blocked | Not Run
	 */
	it("PAGE-SERVICE-013 loads public page and owner plan in one query", async () => {
		let selectCount = 0;
		const db = {
			select: () => {
				selectCount += 1;
				return {
					from: () => ({
						leftJoin: () => ({
							where: async () => [
								{
									page: {
										id: "page-1",
										userId: "user-1",
										handle: "jane",
										imageKey: null,
										imageSource: null,
										imageCrop: null,
										name: "Jane",
										bio: null,
									},
									subscription: {
										productId: "pro-monthly",
										creemSubscriptionId: "subscription-1",
										status: "active",
										periodEnd: new Date("2099-01-01T00:00:00.000Z"),
										cancelAtPeriodEnd: false,
									},
								},
							],
						}),
					}),
				};
			},
		} as unknown as DatabaseClient;

		const result = await getPublicPageWithPlan(db, "jane", ["pro-monthly"]);

		assert.equal(result?.hasProAccess, true);
		assert.equal(selectCount, 1);
	});

	/**
	 * Case ID: PAGE-SERVICE-009
	 * Given: a handle contains surrounding whitespace.
	 * When: getOwnedPage receives the handle and session user ID.
	 * Then: it queries the normalized owner-scoped page lookup.
	 * Evidence: the helper returns the owned page row without exposing another user's page.
	 * Result: Pass | Fail | Blocked | Not Run
	 */
	it("PAGE-SERVICE-009 finds only the signed-in owner's normalized handle", async () => {
		let receivedWhere: unknown;
		const db = withFreePlan({
			query: {
				pages: {
					findFirst: async (input: { where: unknown }) => {
						receivedWhere = input.where;
						return { id: "page-1" };
					},
				},
			},
		});

		const result = await getOwnedPage(db, {
			handle: " Jane ",
			userId: "user-1",
		});

		assert.deepEqual(result, { id: "page-1" });
		assert.ok(receivedWhere);
	});

	/**
	 * Case ID: PAGE-SERVICE-001
	 * Given: an invalid handle is submitted.
	 * When: createPage validates the handle.
	 * Then: it rejects before querying the database.
	 * Evidence: PageServiceError.code=HANDLE_INVALID and the query throws if called.
	 * Result: Pass | Fail | Blocked | Not Run
	 */
	it("PAGE-SERVICE-001 rejects invalid handles before the database query", async () => {
		const db = {
			query: {
				pages: {
					findFirst: async () => {
						throw new Error("database query should not run");
					},
				},
			},
		} as unknown as DatabaseClient;

		await assert.rejects(
			createPage({ db, userId: "user-1", rawHandle: "a_" }),
			(error: unknown) =>
				typeof error === "object" &&
				error !== null &&
				"code" in error &&
				error.code === "HANDLE_INVALID",
		);
	});

	/**
	 * Case ID: PAGE-SERVICE-015
	 * Given: a reserved handle is submitted.
	 * When: createPage checks availability.
	 * Then: it rejects before querying the database.
	 * Evidence: PageServiceError.code=HANDLE_RESERVED and the query throws if called.
	 * Result: Pass | Fail | Blocked | Not Run
	 */
	it("PAGE-SERVICE-015 rejects reserved handles before the database query", async () => {
		const db = {
			query: {
				pages: {
					findFirst: async () => {
						throw new Error("database query should not run");
					},
				},
			},
		} as unknown as DatabaseClient;

		await assert.rejects(
			createPage({ db, userId: "user-1", rawHandle: "changelog" }),
			(error: unknown) =>
				typeof error === "object" &&
				error !== null &&
				"code" in error &&
				error.code === "HANDLE_RESERVED",
		);
	});

	/**
	 * Case ID: PAGE-SERVICE-002
	 * Given: a valid handle already belongs to a page.
	 * When: createPage checks availability.
	 * Then: it rejects with HANDLE_TAKEN before inserting a new page.
	 * Evidence: PageServiceError.code=HANDLE_TAKEN and the query returns page-1.
	 * Result: Pass | Fail | Blocked | Not Run
	 */
	it("PAGE-SERVICE-002 rejects a taken handle", async () => {
		const db = {
			query: {
				pages: {
					findFirst: async () => ({ id: "page-1" }),
				},
			},
		} as unknown as DatabaseClient;

		await assert.rejects(
			createPage({ db, userId: "user-1", rawHandle: "taken-handle" }),
			(error: unknown) =>
				typeof error === "object" &&
				error !== null &&
				"code" in error &&
				error.code === "HANDLE_TAKEN",
		);
	});

	/**
	 * Case ID: PAGE-SERVICE-003
	 * Given: the account has no page yet.
	 * When: createPage inserts the page.
	 * Then: only the page row is written.
	 * Evidence: insert returns the page and no update call happens.
	 * Result: Pass | Fail | Blocked | Not Run
	 */
	it("PAGE-SERVICE-003 creates the account's only page", async () => {
		const tx = {
			execute: async () => undefined,
			query: { pages: { findFirst: async () => undefined } },
			insert() {
				return {
					values() {
						return {
							returning: async () => [{ id: "page-1", handle: "jane" }],
						};
					},
				};
			},
			update() {
				throw new Error("user should not be updated");
			},
		};
		const db = {
			query: { pages: { findFirst: async () => undefined } },
			transaction: async (callback: (value: typeof tx) => unknown) =>
				callback(tx),
		} as unknown as DatabaseClient;

		const page = await createPage({ db, userId: "user-1", rawHandle: "Jane" });

		assert.equal(page.handle, "jane");
	});

	/**
	 * Case ID: PAGE-SERVICE-010
	 * Given: an account (free or Pro) already owns a page.
	 * When: it tries to create another page.
	 * Then: creation is rejected before a second page is inserted.
	 * Evidence: PAGE_ALREADY_EXISTS error and no insert call.
	 * Result: Pass | Fail | Blocked | Not Run
	 */
	it("PAGE-SERVICE-010 allows only one page per account", async () => {
		let insertCalled = false;
		const tx = {
			execute: async () => undefined,
			query: { pages: { findFirst: async () => ({ id: "page-1" }) } },
			insert() {
				insertCalled = true;
				throw new Error("insert should not run");
			},
		};
		const db = {
			query: { pages: { findFirst: async () => undefined } },
			transaction: async (callback: (value: typeof tx) => unknown) =>
				callback(tx),
		} as unknown as DatabaseClient;

		await assert.rejects(
			createPage({ db, userId: "user-1", rawHandle: "another" }),
			(error: unknown) =>
				typeof error === "object" &&
				error !== null &&
				"code" in error &&
				error.code === "PAGE_ALREADY_EXISTS",
		);
		assert.equal(insertCalled, false);
	});

	it("updates only the page handle", async () => {
		let pageValues: Record<string, unknown> | undefined;
		let userValues: Record<string, unknown> | undefined;
		let pageQueryCount = 0;
		const pageUpdate = {
			set(nextValues: Record<string, unknown>) {
				pageValues = nextValues;
				return pageUpdate;
			},
			where() {
				return pageUpdate;
			},
			returning: async () => [{ id: "page-1", handle: "new-handle" }],
		};
		const userUpdate = {
			set(nextValues: Record<string, unknown>) {
				userValues = nextValues;
				return userUpdate;
			},
			where() {
				return userUpdate;
			},
		};
		const tx = {
			query: {},
			update() {
				return pageValues ? userUpdate : pageUpdate;
			},
		};
		const db = withFreePlan({
			query: {
				pages: {
					findFirst: async () => {
						pageQueryCount += 1;
						return pageQueryCount === 1
							? { id: "page-1", handle: "jane" }
							: undefined;
					},
				},
			},
			transaction: async (callback: (value: typeof tx) => unknown) =>
				callback(tx),
		});

		await updatePageHandle({
			db,
			userId: "user-1",
			handle: "jane",
			rawHandle: "new-handle",
		});

		assert.deepEqual(pageValues, { handle: "new-handle" });
		assert.equal(userValues, undefined);
	});

	/**
	 * Case ID: PAGE-SERVICE-005
	 * Given: the signed-in owner submits a profile for their page.
	 * When: completePage updates the page.
	 * Then: image, name, and bio are saved.
	 * Evidence: returned row and captured update values.
	 * Result: Pass | Fail | Blocked | Not Run
	 */
	it("PAGE-SERVICE-004 saves the page profile for its owner", async () => {
		let values: Record<string, unknown> | undefined;
		const imageKey = "users/user-1/pages/page-1/profile/jane.webp";
		const updatedPage = {
			id: "page-1",
			handle: "jane",
			imageKey,
			name: "Jane",
			bio: "Hello",
		};
		const query = {
			set(nextValues: Record<string, unknown>) {
				values = nextValues;
				return query;
			},
			where() {
				return query;
			},
			returning: async () => [updatedPage],
		};
		const db = withFreePlan({
			query: {
				pages: {
					findFirst: async () => ({ id: "page-1", imageKey: null }),
				},
			},
			update: () => query,
		});
		const bucket = {
			head: async () => ({
				size: 100,
				httpMetadata: { contentType: "image/webp" },
			}),
			delete: async () => undefined,
		} as unknown as R2Bucket;

		const result = await completePage({
			db,
			bucket,
			userId: "user-1",
			handle: "Jane",
			profile: {
				imageKey: ` ${imageKey} `,
				name: "Jane",
				bio: "Hello",
			},
		});
		assert.deepEqual(result, updatedPage);
		assert.deepEqual(values, {
			imageKey,
			imageSource: imageKey,
			imageCrop: null,
			name: "Jane",
			bio: "Hello",
		});
	});

	it("PAGE-SERVICE-005 saves a profile with only a name", async () => {
		let values: Record<string, unknown> | undefined;
		const query = {
			set(nextValues: Record<string, unknown>) {
				values = nextValues;
				return query;
			},
			where() {
				return query;
			},
			returning: async () => [{ id: "page-1", name: "Jane" }],
		};
		const db = withFreePlan({
			query: {
				pages: {
					findFirst: async () => ({ id: "page-1", imageKey: null }),
				},
			},
			update: () => query,
		});
		const bucket = {} as R2Bucket;

		await completePage({
			db,
			bucket,
			userId: "user-1",
			handle: "jane",
			profile: { name: "Jane" },
		});
		assert.deepEqual(values, {
			imageKey: null,
			imageSource: null,
			imageCrop: null,
			name: "Jane",
			bio: null,
		});
	});

	/**
	 * Case ID: PAGE-SERVICE-006
	 * Given: R2 stores an owned image without HTTP metadata.
	 * When: the owner completes the page with that image key.
	 * Then: the image key is accepted using the server-generated extension.
	 * Evidence: page update values contain the saved image fields.
	 * Result: Pass | Fail | Blocked | Not Run
	 */
	it("PAGE-SERVICE-006 accepts an owned image without R2 HTTP metadata", async () => {
		let values: Record<string, unknown> | undefined;
		const imageKey = "users/user-1/pages/page-1/profile/jane.jpg";
		const query = {
			set(nextValues: Record<string, unknown>) {
				values = nextValues;
				return query;
			},
			where() {
				return query;
			},
			returning: async () => [{ id: "page-1", imageKey, name: "Jane" }],
		};
		const db = withFreePlan({
			query: {
				pages: {
					findFirst: async () => ({ id: "page-1", imageKey: null }),
				},
			},
			update: () => query,
		});
		const bucket = {
			head: async () => ({ size: 100 }),
			delete: async () => undefined,
		} as unknown as R2Bucket;

		await completePage({
			db,
			bucket,
			userId: "user-1",
			handle: "jane",
			profile: { imageKey, name: "Jane" },
		});
		assert.deepEqual(values, {
			imageKey,
			imageSource: imageKey,
			imageCrop: null,
			name: "Jane",
			bio: null,
		});
	});

	it("PAGE-SERVICE-007 saves a profile draft", async () => {
		let values: Record<string, unknown> | undefined;
		const query = {
			set(nextValues: Record<string, unknown>) {
				values = nextValues;
				return query;
			},
			where() {
				return query;
			},
			returning: async () => [{ id: "page-1", name: "Jane", bio: "Hello" }],
		};
		const db = withFreePlan({
			query: {
				pages: {
					findFirst: async () => ({ id: "page-1", imageKey: null }),
				},
			},
			update: () => query,
		});

		const result = await updatePageDraft({
			db,
			bucket: {} as R2Bucket,
			userId: "user-1",
			handle: "jane",
			draft: { name: " Jane ", bio: " Hello " },
		});

		assert.deepEqual(result, { id: "page-1", name: "Jane", bio: "Hello" });
		assert.deepEqual(values, { name: "Jane", bio: "Hello" });
	});

	it("PAGE-SERVICE-011 saves a cleared page name as null", async () => {
		let values: Record<string, unknown> | undefined;
		const query = {
			set(nextValues: Record<string, unknown>) {
				values = nextValues;
				return query;
			},
			where() {
				return query;
			},
			returning: async () => [{ id: "page-1", name: null, bio: null }],
		};
		const db = withFreePlan({
			query: {
				pages: {
					findFirst: async () => ({ id: "page-1", imageKey: null }),
				},
			},
			update: () => query,
		});

		await updatePageDraft({
			db,
			bucket: {} as R2Bucket,
			userId: "user-1",
			handle: "jane",
			draft: { name: "  ", bio: "  " },
		});

		assert.deepEqual(values, { name: null, bio: null });
	});

	it("PAGE-SERVICE-008 saves a new draft image and queues the old image", async () => {
		let values: Record<string, unknown> | undefined;
		const oldImageKey = "users/user-1/pages/page-1/profile/old.webp";
		const imageKey = "users/user-1/pages/page-1/profile/new.webp";
		const query = {
			set(nextValues: Record<string, unknown>) {
				values = nextValues;
				return query;
			},
			where() {
				return query;
			},
			returning: async () => [{ id: "page-1", imageKey, name: "Jane" }],
		};
		const deletedKeys: string[] = [];
		const db = withFreePlan({
			query: {
				pages: {
					findFirst: async () => ({ id: "page-1", imageKey: oldImageKey }),
				},
			},
			update: () => query,
		});
		const bucket = {
			head: async () => ({
				size: 100,
				httpMetadata: { contentType: "image/webp" },
			}),
			delete: async (keys: string[]) => {
				deletedKeys.push(...keys);
			},
		} as unknown as R2Bucket;

		await updatePageDraft({
			db,
			bucket,
			userId: "user-1",
			handle: "jane",
			draft: { name: "Jane", imageKey },
		});

		assert.deepEqual(values, {
			name: "Jane",
			imageKey,
			imageSource: imageKey,
			imageCrop: null,
		});
		assert.deepEqual(deletedKeys, []);
	});

	it("PAGE-SERVICE-010 saves a profile image crop without replacing the image", async () => {
		let values: Record<string, unknown> | undefined;
		const query = {
			set(nextValues: Record<string, unknown>) {
				values = nextValues;
				return query;
			},
			where() {
				return query;
			},
			returning: async () => [{ id: "page-1", imageCrop: null }],
		};
		const db = withFreePlan({
			query: {
				pages: {
					findFirst: async () => ({
						id: "page-1",
						imageKey: "users/user-1/pages/page-1/profile/avatar.webp",
					}),
				},
			},
			update: () => query,
		});
		const crop = { x: 10, y: 0, width: 80, height: 100 };

		await updatePageDraft({
			db,
			bucket: {} as R2Bucket,
			userId: "user-1",
			handle: "jane",
			draft: { name: "Jane", imageCrop: crop },
		});

		assert.deepEqual(values, { name: "Jane", imageCrop: crop });
	});
});
