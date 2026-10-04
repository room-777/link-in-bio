import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { DatabaseClient } from "@grabbin/db";
import { pageDomains } from "@grabbin/db/schema/index";
import type { SQL } from "drizzle-orm";
import { getTableConfig, PgDialect } from "drizzle-orm/pg-core";
import { createPageDomainRepository } from "../../src/models/page-domain.model";
import { present } from "../fixtures/page-domain.fixture";

describe("page domain storage contract", () => {
	/** Case ID: DOMAIN-DB-001
	 * Given: domain schema. When: storage constraints are inspected.
	 * Then: unique page/hostname/provider IDs and retained orphan rows are declared.
	 * Evidence: Drizzle index columns and foreign-key deletion rule. Result: Pass | Fail | Blocked | Not Run
	 */
	it("DOMAIN-DB-001 declares uniqueness and retained provider IDs", () => {
		const config = getTableConfig(pageDomains);
		assert.deepEqual(
			config.indexes
				.filter((index) => index.config.unique)
				.map((index) => index.config.name)
				.sort(),
			[
				"page_domains_cloudflare_id_unique",
				"page_domains_hostname_unique",
				"page_domains_page_id_unique",
			],
		);
		assert.equal(present(config.foreignKeys[0]).onDelete, "set null");
		assert.equal(pageDomains.pageId.notNull, false);
	});
	/** Case ID: DOMAIN-DB-002
	 * Given: a transaction-capable database stand-in. When: page and domain mutations acquire locks.
	 * Then: run callbacks after parameterized row locks in transactions.
	 * Evidence: transaction counts, SQL text, parameters and callback order. Result: Pass | Fail | Blocked | Not Run
	 */
	it("DOMAIN-DB-002 locks the correct rows before mutations", async () => {
		const events: string[] = [];
		const queries: { sql: string; params: unknown[] }[] = [];
		const tx = {
			execute: async (query: SQL) => {
				queries.push(new PgDialect().sqlToQuery(query));
				events.push("lock");
			},
		};
		const db = {
			transaction: async (
				work: (transaction: typeof tx) => Promise<unknown>,
			) => {
				events.push("transaction");
				return work(tx);
			},
		} as unknown as DatabaseClient;
		const repo = createPageDomainRepository(db);
		await repo.lockPage("test-page", async () => {
			events.push("work");
		});
		await repo.lockDomain("test-domain", async () => {
			events.push("work");
		});
		assert.deepEqual(events, [
			"transaction",
			"lock",
			"work",
			"transaction",
			"lock",
			"work",
		]);
		assert.match(
			present(queries[0]).sql,
			/from pages where id = \$1 for update/,
		);
		assert.deepEqual(present(queries[0]).params, ["test-page"]);
		assert.match(
			present(queries[1]).sql,
			/from page_domains where id = \$1 for update/,
		);
		assert.deepEqual(present(queries[1]).params, ["test-domain"]);
	});
});
