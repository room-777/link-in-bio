import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { DatabaseClient } from "@grabbin/db";

import { completePage, createPage } from "../../src/services/page.service";

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
	 * Given: the signed-in owner submits a profile for their page.
	 * When: completePage updates the page.
	 * Then: image, name, bio are saved and onboarding becomes true.
	 * Evidence: returned row and captured update values.
	 * Result: Pass | Fail | Blocked | Not Run
	 */
	it("PAGE-SERVICE-003 completes onboarding for the page owner", async () => {
		let values: Record<string, unknown> | undefined;
		const updatedPage = {
			id: "page-1",
			handle: "jane",
			onboarding: true,
			image: "https://example.com/jane.png",
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
			update: () => query,
		} as unknown as DatabaseClient;

		const result = await completePage({
			db,
			userId: "user-1",
			handle: "Jane",
			profile: {
				image: " https://example.com/jane.png ",
				name: "Jane",
				bio: "Hello",
			},
		});
		assert.deepEqual(result, updatedPage);
		assert.deepEqual(values, {
			image: "https://example.com/jane.png",
			name: "Jane",
			bio: "Hello",
			onboarding: true,
		});
	});

	it("PAGE-SERVICE-004 completes onboarding with only a name", async () => {
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
			update: () => query,
		} as unknown as DatabaseClient;

		await completePage({
			db,
			userId: "user-1",
			handle: "jane",
			profile: { name: "Jane" },
		});
		assert.deepEqual(values, {
			image: null,
			name: "Jane",
			bio: null,
			onboarding: true,
		});
	});
});
