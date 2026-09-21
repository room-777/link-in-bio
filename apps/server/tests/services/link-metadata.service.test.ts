import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { DatabaseClient } from "@grabbin/db";

import { PageItemServiceError } from "../../src/exceptions/page-item.exception";
import { enrichPageItemMetadata } from "../../src/services/link-metadata.service";

const layout = { x: 0, y: 0, w: 1, h: 2 };

function createDatabase() {
	const now = new Date("2026-09-21T00:00:00.000Z");
	const current = {
		id: "item-1",
		pageId: "page-1",
		type: "link",
		data: { url: "https://example.com" },
		style: {},
		layouts: { wide: layout, compact: layout },
		createdAt: now,
		updatedAt: now,
	};
	const db = {
		query: {
			pages: { findFirst: async () => ({ id: "page-1" }) },
			pageItems: {
				findFirst: async () => current,
			},
		},
		update: () => ({
			set(values: Record<string, unknown>) {
				Object.assign(current, values, { updatedAt: now });
				return {
					where: async () => undefined,
				};
			},
		}),
	} as unknown as DatabaseClient;
	return { db, current };
}

describe("link metadata service", () => {
	it("LINK-METADATA-SERVICE-001 stores safe Open Graph metadata", async () => {
		const { db, current } = createDatabase();
		const result = await enrichPageItemMetadata({
			db,
			handle: "jane",
			userId: "user-1",
			itemId: "item-1",
			url: "https://example.com",
			fetch: async () =>
				new Response(
					'<html><head><title> Example </title><meta name="description" content="A page"><meta property="og:image" content="https://cdn.example.com/card.png"></head></html>',
					{ headers: { "content-type": "text/html" } },
				),
		});

		assert.equal(result.type, "link");
		if (result.type !== "link") return;
		assert.equal(result.data.metadata?.title, "Example");
		assert.equal(result.data.metadata?.description, "A page");
		assert.equal(
			result.data.metadata?.imageUrl,
			"https://cdn.example.com/card.png",
		);
		assert.deepEqual(current.data, {
			url: "https://example.com",
			metadata: {
				title: "Example",
				description: "A page",
				imageUrl: "https://cdn.example.com/card.png",
			},
		});
	});

	it("LINK-METADATA-SERVICE-002 ignores stale URL refreshes", async () => {
		const { db } = createDatabase();
		let fetchCalls = 0;

		await assert.rejects(
			enrichPageItemMetadata({
				db,
				handle: "jane",
				userId: "user-1",
				itemId: "item-1",
				url: "https://other.example.com",
				fetch: async () => {
					fetchCalls += 1;
					return new Response();
				},
			}),
			(error: unknown) =>
				error instanceof PageItemServiceError &&
				error.code === "STALE_LINK_METADATA",
		);
		assert.equal(fetchCalls, 0);
	});
});
