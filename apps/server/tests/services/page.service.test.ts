import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { R2Bucket } from "@cloudflare/workers-types";
import type { DatabaseClient } from "@grabbin/db";

import {
	completePage,
	createPage,
	updatePageDraft,
	updatePageHandle,
} from "../../src/services/page.service";

describe("page service", () => {
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
	 * Given: a user without a page submits an available handle.
	 * When: createPage inserts the page.
	 * Then: the user's primary page handle is saved in the same transaction.
	 * Evidence: captured user update values contain the created page handle.
	 * Result: Pass | Fail | Blocked | Not Run
	 */
	it("PAGE-SERVICE-003 stores the created handle as the primary page handle", async () => {
		let userValues: Record<string, unknown> | undefined;
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
			insert() {
				return {
					values() {
						return {
							returning: async () => [{ id: "page-1", handle: "jane" }],
						};
					},
				};
			},
			update: () => userUpdate,
		};
		const db = {
			query: {
				pages: {
					findFirst: async () => undefined,
				},
			},
			transaction: async (callback: (value: typeof tx) => unknown) =>
				callback(tx),
		} as unknown as DatabaseClient;

		await createPage({ db, userId: "user-1", rawHandle: "Jane" });

		assert.deepEqual(userValues, { primaryPageHandle: "jane" });
	});

	it("updates the page and primary user handle together", async () => {
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
			update() {
				return pageValues ? userUpdate : pageUpdate;
			},
		};
		const db = {
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
		} as unknown as DatabaseClient;

		await updatePageHandle({
			db,
			userId: "user-1",
			handle: "jane",
			rawHandle: "new-handle",
		});

		assert.deepEqual(pageValues, { handle: "new-handle" });
		assert.deepEqual(userValues, { primaryPageHandle: "new-handle" });
	});

	/**
	 * Case ID: PAGE-SERVICE-005
	 * Given: the signed-in owner submits a profile for their page.
	 * When: completePage updates the page.
	 * Then: image, name, bio are saved and onboarding becomes true.
	 * Evidence: returned row and captured update values.
	 * Result: Pass | Fail | Blocked | Not Run
	 */
	it("PAGE-SERVICE-004 completes onboarding for the page owner", async () => {
		let values: Record<string, unknown> | undefined;
		const imageKey = "users/user-1/pages/page-1/profile/jane.webp";
		const updatedPage = {
			id: "page-1",
			handle: "jane",
			onboarding: true,
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
		const db = {
			query: {
				pages: {
					findFirst: async () => ({ id: "page-1", imageKey: null }),
				},
			},
			update: () => query,
		} as unknown as DatabaseClient;
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
			name: "Jane",
			bio: "Hello",
			onboarding: true,
		});
	});

	it("PAGE-SERVICE-005 completes onboarding with only a name", async () => {
		let values: Record<string, unknown> | undefined;
		const query = {
			set(nextValues: Record<string, unknown>) {
				values = nextValues;
				return query;
			},
			where() {
				return query;
			},
			returning: async () => [{ id: "page-1", name: "Jane", onboarding: true }],
		};
		const db = {
			query: {
				pages: {
					findFirst: async () => ({ id: "page-1", imageKey: null }),
				},
			},
			update: () => query,
		} as unknown as DatabaseClient;
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
			name: "Jane",
			bio: null,
			onboarding: true,
		});
	});

	/**
	 * Case ID: PAGE-SERVICE-006
	 * Given: R2 stores an owned image without HTTP metadata.
	 * When: the owner completes the page with that image key.
	 * Then: the image key is accepted using the server-generated extension.
	 * Evidence: page update values contain the image key and onboarding state.
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
		const db = {
			query: {
				pages: {
					findFirst: async () => ({ id: "page-1", imageKey: null }),
				},
			},
			update: () => query,
		} as unknown as DatabaseClient;
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
			name: "Jane",
			bio: null,
			onboarding: true,
		});
	});

	it("PAGE-SERVICE-007 saves a draft without completing onboarding", async () => {
		let values: Record<string, unknown> | undefined;
		const query = {
			set(nextValues: Record<string, unknown>) {
				values = nextValues;
				return query;
			},
			where() {
				return query;
			},
			returning: async () => [
				{ id: "page-1", name: "Jane", bio: "Hello", onboarding: false },
			],
		};
		const db = {
			query: {
				pages: {
					findFirst: async () => ({ id: "page-1", imageKey: null }),
				},
			},
			update: () => query,
		} as unknown as DatabaseClient;

		const result = await updatePageDraft({
			db,
			bucket: {} as R2Bucket,
			userId: "user-1",
			handle: "jane",
			draft: { name: " Jane ", bio: " Hello " },
		});

		assert.equal(result.onboarding, false);
		assert.deepEqual(values, { name: "Jane", bio: "Hello" });
	});

	it("PAGE-SERVICE-008 saves a new draft image and removes the old image", async () => {
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
			returning: async () => [
				{ id: "page-1", imageKey, name: "Jane", onboarding: true },
			],
		};
		const deletedKeys: string[] = [];
		const db = {
			query: {
				pages: {
					findFirst: async () => ({ id: "page-1", imageKey: oldImageKey }),
				},
			},
			update: () => query,
		} as unknown as DatabaseClient;
		const bucket = {
			head: async () => ({
				size: 100,
				httpMetadata: { contentType: "image/webp" },
			}),
			delete: async (key: string) => {
				deletedKeys.push(key);
			},
		} as unknown as R2Bucket;

		await updatePageDraft({
			db,
			bucket,
			userId: "user-1",
			handle: "jane",
			draft: { name: "Jane", imageKey },
		});

		assert.deepEqual(values, { name: "Jane", imageKey });
		assert.deepEqual(deletedKeys, [oldImageKey]);
	});
});
