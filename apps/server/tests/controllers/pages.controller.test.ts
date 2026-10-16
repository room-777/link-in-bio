import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { DatabaseClient } from "@grabbin/db";

const { mock } = require("bun:test") as {
	mock: { module: (specifier: string, factory: () => unknown) => void };
};

let userHasPage = false;

/** Enough of Drizzle for createPage: a free handle and one transaction. */
const fakeDb = {
	query: { pages: { findFirst: async () => null } },
	transaction: async (run: (tx: unknown) => Promise<unknown>) =>
		run({
			execute: async () => undefined,
			query: {
				pages: {
					findFirst: async () => (userHasPage ? { id: "page-0" } : null),
				},
			},
			insert: () => ({
				values: (row: Record<string, unknown>) => ({
					returning: async () => [{ ...row }],
				}),
			}),
		}),
} as unknown as DatabaseClient;

mock.module("cloudflare:workers", () => ({ env: {}, waitUntil: () => {} }));
mock.module("../../src/middlewares/session.middleware", () => {
	const withSession = async (
		c: { set: (key: string, value: unknown) => void },
		next: () => Promise<void>,
	) => {
		c.set("db", fakeDb);
		c.set("session", { user: { id: "user-1", email: "user@example.com" } });
		await next();
	};
	return { requiredSession: withSession, optionalSession: withSession };
});
const { pagesController } = await import(
	"../../src/controllers/pages.controller"
);

function createPageRequest(cookie = "_ga=GA1.1.5.6") {
	return pagesController.request("/", {
		method: "POST",
		headers: { "Content-Type": "application/json", cookie },
		body: JSON.stringify({ handle: "jane" }),
	});
}

describe("pages controller", () => {
	/**
	 * Case ID: PAGE-API-GA-001
	 * Given: a signed-in user whose page creation succeeds.
	 * When: POST /pages returns 201.
	 * Then: the new page is returned to the browser.
	 * Evidence: HTTP 201 and the returned page handle.
	 * Result: Pass | Fail | Blocked | Not Run
	 */
	it("PAGE-API-GA-001 returns the page after a successful create", async () => {
		userHasPage = false;
		const response = await createPageRequest();

		assert.equal(response.status, 201);
		const body = (await response.json()) as { page: { handle: string } };
		assert.equal(body.page.handle, "jane");
	});

	/**
	 * Case ID: PAGE-API-GA-002
	 * Given: page creation fails (the user already has a page, or bad input).
	 * When: POST /pages returns an error.
	 * Then: the server returns an error instead of creating a page.
	 * Evidence: HTTP 409/400.
	 * Result: Pass | Fail | Blocked | Not Run
	 */
	it("PAGE-API-GA-002 returns an error when creation fails", async () => {
		userHasPage = true;
		assert.equal((await createPageRequest()).status, 409);
		const invalid = await pagesController.request("/", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: "{}",
		});
		assert.equal(invalid.status, 400);
	});
});
