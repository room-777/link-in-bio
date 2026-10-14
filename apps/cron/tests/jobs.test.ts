import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { R2Bucket } from "@cloudflare/workers-types";
import type { DatabaseClient } from "@grabbin/db";
import { runDailyMaintenance } from "../src/jobs/daily-maintenance";
import type { CronBindings } from "../src/jobs/types";

describe("daily maintenance", () => {
	/** Case ID: DOMAIN-JOB-003
	 * Given: no Pro product or SaaS configuration. When: the original daily job runs.
	 * Then: no page-deletion scan runs (multi-page cleanup was removed). Evidence: zero page reads and empty skipped-user set. Result: Pass | Fail | Blocked | Not Run
	 */
	it("DOMAIN-JOB-003 does not scan pages for deletion", async () => {
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
			transaction: async (callback: (tx: unknown) => unknown) =>
				callback({
					select: () => ({
						from: () => ({
							where: () => ({ limit: async () => [] }),
						}),
					}),
				}),
		} as unknown as DatabaseClient;
		const result = await runDailyMaintenance({
			db,
			bindings: {
				R2_BUCKET: { delete: async () => undefined } as unknown as R2Bucket,
			} as CronBindings,
			date: new Date(),
		});
		assert.equal(pageReads, 0);
		assert.equal(result.size, 0);
	});
	/** Case ID: DOMAIN-JOB-004
	 * Given: SaaS and Pro are configured, with no expired records. When: daily maintenance runs.
	 * Then: refresh billing before deciding domain expiration.
	 * Evidence: ordered model calls and a DB-only expiration batch of 100. Result: Pass | Fail | Blocked | Not Run
	 */
	it("DOMAIN-JOB-004 decides expiration after billing refresh and retries deletions", async () => {
		const events: string[] = [];
		let domainReads = 0;
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
						domainReads += 1;
						assert.equal(query.limit, 100);
						events.push(
							domainReads === 1 ? "domains-expiry" : "domains-delete-retry",
						);
						return [];
					},
				},
			},
			transaction: async (callback: (tx: unknown) => unknown) =>
				callback({
					select: () => ({
						from: () => ({
							where: () => ({ limit: async () => [] }),
						}),
					}),
				}),
		} as unknown as DatabaseClient;
		const bindings = {
			CLOUDFLARE_SAAS_ZONE_ID: "fake-zone",
			CLOUDFLARE_SAAS_API_TOKEN: "fake-test-token",
			CREEM_PRO_MONTHLY_PRODUCT_ID: "pro-test",
			PAGE_DOMAIN: "grabbin.me",
			R2_BUCKET: { delete: async () => undefined } as unknown as R2Bucket,
		} as CronBindings;
		await runDailyMaintenance({ db, bindings, date: new Date() });
		assert.deepEqual(events, [
			"billing",
			"domains-expiry",
			"domains-delete-retry",
		]);
	});
});
