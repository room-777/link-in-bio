import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { DatabaseClient } from "@grabbin/db";
import { runScheduledJobs } from "../../src/services/scheduled.service";
import type { AppEnv } from "../../src/types";

describe("scheduled domain maintenance", () => {
	/** Case ID: DOMAIN-JOB-001
	 * Given: SaaS credentials and no due domains. When: the five-minute job runs.
	 * Then: scan domains once without running daily billing or page deletion.
	 * Evidence: query counts, fixed batch limit and empty skipped-user set. Result: Pass | Fail | Blocked | Not Run
	 */
	it("DOMAIN-JOB-001 separates frequent domain checks from daily jobs", async () => {
		let domainReads = 0;
		const db = {
			query: {
				pageDomains: {
					findMany: async (query: { limit: number }) => {
						domainReads += 1;
						assert.equal(query.limit, 10);
						return [];
					},
				},
			},
		} as unknown as DatabaseClient;
		const bindings = {
			CLOUDFLARE_SAAS_ZONE_ID: "fake-zone",
			CLOUDFLARE_SAAS_API_TOKEN: "fake-test-token",
			PAGE_DOMAIN: "grabbin.me",
		} as AppEnv["Bindings"];
		const result = await runScheduledJobs({
			db,
			bindings,
			date: new Date("2026-10-04T00:00:00Z"),
			cron: "*/5 * * * *",
		});
		assert.equal(domainReads, 1);
		assert.equal(result.size, 0);
	});
	/** Case ID: DOMAIN-JOB-002
	 * Given: SaaS has not been configured. When: the five-minute job runs.
	 * Then: no new table or provider is accessed. Evidence: no database methods and returned empty set. Result: Pass | Fail | Blocked | Not Run
	 */
	it("DOMAIN-JOB-002 stays inactive before configuration", async () => {
		const result = await runScheduledJobs({
			db: {} as DatabaseClient,
			bindings: {} as AppEnv["Bindings"],
			cron: "*/5 * * * *",
		});
		assert.equal(result.size, 0);
	});
	/** Case ID: DOMAIN-JOB-003
	 * Given: no Pro product or SaaS configuration. When: the original daily job runs.
	 * Then: keep the existing expired-page scan. Evidence: page query count and empty skipped-user set. Result: Pass | Fail | Blocked | Not Run
	 */
	it("DOMAIN-JOB-003 preserves the daily page cleanup", async () => {
		let pageReads = 0;
		const db = {
			query: {
				pages: {
					findMany: async () => {
						pageReads += 1;
						return [];
					},
				},
			},
		} as unknown as DatabaseClient;
		const result = await runScheduledJobs({
			db,
			bindings: {} as AppEnv["Bindings"],
		});
		assert.equal(pageReads, 1);
		assert.equal(result.size, 0);
	});
	/** Case ID: DOMAIN-JOB-004
	 * Given: SaaS and Pro are configured, with no expired records. When: daily maintenance runs.
	 * Then: refresh billing and clean pages before deciding domain expiration.
	 * Evidence: ordered model calls and a DB-only expiration batch of 100. Result: Pass | Fail | Blocked | Not Run
	 */
	it("DOMAIN-JOB-004 decides expiration after billing refresh", async () => {
		const events: string[] = [];
		const db = {
			query: {
				creemSubscription: {
					findMany: async () => {
						events.push("billing");
						return [];
					},
				},
				pages: {
					findMany: async () => {
						events.push("pages");
						return [];
					},
				},
				pageDomains: {
					findMany: async (query: { limit: number }) => {
						assert.equal(query.limit, 100);
						events.push("domains");
						return [];
					},
				},
			},
		} as unknown as DatabaseClient;
		const bindings = {
			CLOUDFLARE_SAAS_ZONE_ID: "fake-zone",
			CLOUDFLARE_SAAS_API_TOKEN: "fake-test-token",
			CREEM_PRO_MONTHLY_PRODUCT_ID: "pro-test",
			PAGE_DOMAIN: "grabbin.me",
		} as AppEnv["Bindings"];
		await runScheduledJobs({ db, bindings });
		assert.deepEqual(events, ["billing", "pages", "domains"]);
	});
});
