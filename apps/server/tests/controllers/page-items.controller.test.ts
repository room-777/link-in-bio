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
	enrichMetadata: Parameters<
		typeof createPageItemsController
	>[0]["enrichMetadata"] = async () => {
		throw new Error("metadata service should not run");
	},
) {
	return new Hono<AppEnv>().route(
		"/pages",
		createPageItemsController({ sessionMiddleware, persist, enrichMetadata }),
	);
}

describe("page items controller", () => {
	it("PAGE-ITEM-API-004 rejects invalid media upload input", async () => {
		const app = createTestApp(async () => ({ items: [] }));
		const response = await app.request("/pages/jane/items/upload", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ contentType: "text/plain", size: 1 }),
		});

		assert.equal(response.status, 422);
		assert.deepEqual(await response.json(), {
			status: 422,
			code: "INVALID_MEDIA_UPLOAD",
			title: "Unprocessable Entity",
			detail: "Invalid item media.",
		});
	});

	it("PAGE-ITEM-API-005 rejects invalid media completion input", async () => {
		const app = createTestApp(async () => ({ items: [] }));
		const response = await app.request("/pages/jane/items/upload/complete", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ objectKey: "" }),
		});

		assert.equal(response.status, 422);
		assert.deepEqual(await response.json(), {
			status: 422,
			code: "INVALID_MEDIA_KEY",
			title: "Unprocessable Entity",
			detail: "The media object key is invalid.",
		});
	});

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

	it("PAGE-ITEM-API-006 forwards an authenticated metadata refresh", async () => {
		let captured:
			| { handle: string; userId: string; itemId: string; url: string }
			| undefined;
		const item = {
			id: "item-1",
			type: "link" as const,
			data: { url: "https://example.com" },
			style: {},
			layouts: {
				wide: { x: 0, y: 0, w: 1, h: 2 },
				compact: { x: 0, y: 0, w: 1, h: 2 },
			},
			createdAt: "2026-09-21T00:00:00.000Z",
			updatedAt: "2026-09-21T00:00:00.000Z",
		};
		const app = createTestApp(
			async () => ({ items: [] }),
			async (input) => {
				captured = {
					handle: input.handle,
					userId: input.userId,
					itemId: input.itemId,
					url: input.url,
				};
				return item;
			},
		);

		const response = await app.request("/pages/jane/metadata", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ itemId: "item-1", url: "https://example.com" }),
		});

		assert.equal(response.status, 200);
		assert.deepEqual(captured, {
			handle: "jane",
			userId: "user-1",
			itemId: "item-1",
			url: "https://example.com",
		});
		const body = (await response.json()) as { item: unknown };
		assert.deepEqual(body.item, item);
	});

	it("PAGE-ITEM-API-007 rejects an invalid metadata refresh body", async () => {
		let enrichCalls = 0;
		const app = createTestApp(
			async () => ({ items: [] }),
			async () => {
				enrichCalls += 1;
				throw new Error("should not run");
			},
		);

		const response = await app.request("/pages/jane/metadata", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ itemId: "item-1", url: "http://example.com" }),
		});

		assert.equal(response.status, 422);
		assert.equal(enrichCalls, 0);
	});
});
