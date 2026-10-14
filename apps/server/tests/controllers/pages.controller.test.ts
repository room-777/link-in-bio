import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { DatabaseClient } from "@grabbin/db";

const { mock } = require("bun:test") as {
	mock: { module: (specifier: string, factory: () => unknown) => void };
};

const tracked: Array<Record<string, unknown>> = [];
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
mock.module("@grabbin/auth/server-events", () => ({
	serverEvents: {
		track: (input: Record<string, unknown>) => {
			tracked.push(input);
			return Promise.resolve({ sent: true });
		},
	},
}));
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

describe("pages controller GA events", () => {
	/**
	 * Case ID: PAGE-API-GA-001
	 * Given: a signed-in user whose page creation succeeds.
	 * When: POST /pages returns 201.
	 * Then: page_created is queued once as a once-only event for that user,
	 *   with the request headers (GA cookies) and a time_since_signup reader.
	 * Evidence: HTTP 201 and the recorded tracker call.
	 * Result: Pass | Fail | Blocked | Not Run
	 */
	it("PAGE-API-GA-001 queues page_created after a successful create", async () => {
		tracked.length = 0;
		userHasPage = false;
		const response = await createPageRequest();

		assert.equal(response.status, 201);
		assert.equal(tracked.length, 1);
		assert.equal(tracked[0]?.name, "page_created");
		assert.equal(tracked[0]?.once, "page_created");
		assert.equal(tracked[0]?.userId, "user-1");
		assert.equal(typeof tracked[0]?.params, "function");
		assert.equal(
			(tracked[0]?.headers as Headers | undefined)?.get("cookie"),
			"_ga=GA1.1.5.6",
		);
	});

	/**
	 * Case ID: PAGE-API-GA-002
	 * Given: page creation fails (the user already has a page, or bad input).
	 * When: POST /pages returns an error.
	 * Then: no GA event is queued.
	 * Evidence: HTTP 409/400 and an empty tracker log.
	 * Result: Pass | Fail | Blocked | Not Run
	 */
	it("PAGE-API-GA-002 queues nothing when creation fails", async () => {
		tracked.length = 0;
		userHasPage = true;
		assert.equal((await createPageRequest()).status, 409);
		const invalid = await pagesController.request("/", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: "{}",
		});
		assert.equal(invalid.status, 400);
		assert.equal(tracked.length, 0);
	});
});
