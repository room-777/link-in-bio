/**
 * Page handle updates against a disposable local PostgreSQL database.
 * Set PAGE_HANDLE_TEST_DATABASE_URL to
 * postgres://postgres:postgres@127.0.0.1:5432/page_handle_test.
 * This test drops and recreates the public schema in that database.
 */
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { after, before, describe, it } from "node:test";
import type { DatabaseClient } from "@grabbin/db";
import { drizzle } from "@grabbin/db/drizzle";
import * as schema from "@grabbin/db/schema/index";
import { pages, user } from "@grabbin/db/schema/index";
import { assertLocalTestDatabase } from "@grabbin/env/prod-guard";
import { Client } from "pg";
import { updatePageHandle } from "../../src/services/page.service";

const url = process.env.PAGE_HANDLE_TEST_DATABASE_URL;
const local =
	!!url && /@(127\.0\.0\.1|localhost):\d+\/page_handle_test$/.test(url);
let client: Client;
let db: DatabaseClient;

async function migrate() {
	await client.query(
		"drop schema if exists public cascade; create schema public;",
	);
	await client.query("drop schema if exists drizzle cascade;");
	const dir = join(
		import.meta.dirname,
		"../../../../packages/db/src/migrations",
	);
	for (const file of readdirSync(dir)
		.filter((name) => name.endsWith(".sql"))
		.sort()) {
		for (const statement of readFileSync(join(dir, file), "utf8").split(
			"--> statement-breakpoint",
		)) {
			if (statement.trim()) await client.query(statement);
		}
	}
}

describe("page handle updates against local Postgres", { skip: !local }, () => {
	before(async () => {
		if (!url) throw new Error("PAGE_HANDLE_TEST_DATABASE_URL is required");
		assertLocalTestDatabase(url, "page_handle_test");
		client = new Client({ connectionString: url });
		await client.connect();
		await migrate();
		db = drizzle({ client, schema }) as unknown as DatabaseClient;
	});
	after(async () => {
		await client?.end();
	});

	/**
	 * Case ID: PAGE-HANDLE-INT-001
	 * Given: an owner page created from the latest migrations.
	 * When: the owner changes its handle.
	 * Then: the page row stores the new handle without running a legacy trigger.
	 * Evidence: service response and persisted page handle.
	 * Result: Pass | Fail | Blocked | Not Run
	 */
	it("PAGE-HANDLE-INT-001 updates a page handle after dropping its legacy trigger", async () => {
		await db.insert(user).values({
			id: "page-handle-owner",
			name: "Page Handle Owner",
			email: "page-handle-owner@example.com",
		});
		await db.insert(pages).values({
			id: "page-handle-page",
			userId: "page-handle-owner",
			handle: "old-handle",
		});

		const result = await updatePageHandle({
			db,
			userId: "page-handle-owner",
			handle: "old-handle",
			rawHandle: "new-handle",
		});
		const persistedPage = await db.query.pages.findFirst({
			where: (table, { eq }) => eq(table.id, "page-handle-page"),
			columns: { handle: true },
		});

		assert.equal(result.handle, "new-handle");
		assert.equal(persistedPage?.handle, "new-handle");
	});
});
