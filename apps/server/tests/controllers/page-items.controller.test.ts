import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { DatabaseClient } from "@grabbin/db";
import type { MiddlewareHandler } from "hono";
import { Hono } from "hono";

import { createPageItemsController } from "../../src/controllers/page-items.controller";
import { PageItemServiceError } from "../../src/exceptions/page-item.exception";
import type { AppEnv } from "../../src/types";

const sessionMiddleware: MiddlewareHandler<AppEnv> = async (c, next) => {
	c.set("db", {} as DatabaseClient);
	c.set("session", { user: { id: "user-1" } });
	await next();
};

function createTestApp(
	persist: Parameters<typeof createPageItemsController>[0]["persist"],
) {
	return new Hono<AppEnv>().route(
		"/pages",
		createPageItemsController({ sessionMiddleware, persist }),
	);
}

describe("page items controller", () => {
	/**
	 * Case ID: PAGE-ITEM-API-001
	 * Given: an authenticated request contains an invalid batch body.
	 * When: PATCH /pages/:handle/batch parses the body.
	 * Then: it returns 422 without calling the service.
	 * Evidence: HTTP status=422 and persist call count=0.
	 * Result: Pass | Fail | Blocked | Not Run
	 */
	it("PAGE-ITEM-API-001 rejects an invalid batch at the HTTP boundary", async () => {
		let persistCalls = 0;
		const app = createTestApp(async () => {
			persistCalls += 1;
			return { items: [] };
		});

		const response = await app.request("/pages/jane/batch", {
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ upserts: [{ id: "missing-type" }] }),
		});

		assert.equal(response.status, 422);
		assert.equal(
			response.headers.get("content-type"),
			"application/problem+json",
		);
		assert.equal(persistCalls, 0);
	});

	/**
	 * Case ID: PAGE-ITEM-API-002
	 * Given: an authenticated owner submits an empty batch.
	 * When: PATCH /pages/:handle/batch handles the request.
	 * Then: it passes the normalized owner and handle to the service.
	 * Evidence: HTTP status=200 and captured service input.
	 * Result: Pass | Fail | Blocked | Not Run
	 */
	it("PAGE-ITEM-API-002 forwards the authenticated owner to the service", async () => {
		let captured:
			| { handle: string; userId: string; batch: unknown }
			| undefined;
		const app = createTestApp(async (input) => {
			captured = {
				handle: input.handle,
				userId: input.userId,
				batch: input.batch,
			};
			return { items: [] };
		});

		const response = await app.request("/pages/jane/batch", {
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ upserts: [], deletes: [] }),
		});

		assert.equal(response.status, 200);
		assert.deepEqual(captured, {
			handle: "jane",
			userId: "user-1",
			batch: { upserts: [], deletes: [] },
		});
	});

	/**
	 * Case ID: PAGE-ITEM-API-003
	 * Given: the service detects a stale item update.
	 * When: the controller maps the service error.
	 * Then: it returns 409 with the public error contract.
	 * Evidence: HTTP status=409 and code=CONCURRENT_ITEM_UPDATE.
	 * Result: Pass | Fail | Blocked | Not Run
	 */
	it("PAGE-ITEM-API-003 maps stale updates to a conflict", async () => {
		const app = createTestApp(async () => {
			throw new PageItemServiceError("CONCURRENT_ITEM_UPDATE");
		});

		const response = await app.request("/pages/jane/batch", {
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ upserts: [], deletes: [] }),
		});

		assert.equal(response.status, 409);
		assert.deepEqual(await response.json(), {
			status: 409,
			code: "CONCURRENT_ITEM_UPDATE",
			title: "Conflict",
			detail: "The item changed before this update was saved.",
		});
	});
});
