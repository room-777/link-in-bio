import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { DatabaseClient } from "@grabbin/db";
import { PgDialect } from "drizzle-orm/pg-core";
import {
	listSitemapHandles,
	reconcileUserPageLifecycle,
} from "../../src/services/page-lifecycle.service";

function makeDb(input: {
	primaryPageHandle: string;
	status: string;
	periodEnd: Date | null;
	cancelAtPeriodEnd?: boolean;
}) {
	const updates: Record<string, unknown>[] = [];
	const update = {
		set(values: Record<string, unknown>) {
			updates.push(values);
			return update;
		},
		where: async () => undefined,
	};
	const tx = {
		execute: async () => undefined,
		query: {
			user: {
				findFirst: async () => ({ primaryPageHandle: input.primaryPageHandle }),
			},
			creemSubscription: {
				findMany: async () => [
					{
						productId: "pro-monthly",
						status: input.status,
						periodEnd: input.periodEnd,
						cancelAtPeriodEnd: input.cancelAtPeriodEnd ?? true,
					},
				],
			},
		},
		update: () => update,
	};
	const db = {
		transaction: async (callback: (value: typeof tx) => unknown) =>
			callback(tx),
	} as unknown as DatabaseClient;
	return { db, updates };
}

describe("page lifecycle service", () => {
	/**
	 * Case ID: PAGE-SITEMAP-SERVICE-001
	 * Given: the query returns public pages, including a draft and reserved handle.
	 * When: sitemap handles are listed.
	 * Then: drafts remain eligible, reserved handles are omitted, and results stay sorted.
	 * Evidence: returned handles and the rendered Drizzle filter.
	 * Result: Pass | Fail | Blocked | Not Run
	 */
	it("PAGE-SITEMAP-SERVICE-001 includes public draft handles", async () => {
		let queryOptions: Record<string, unknown> | undefined;
		const db = {
			query: {
				pages: {
					findMany: async (options: Record<string, unknown>) => {
						queryOptions = options;
						return [
							{ handle: "avery" },
							{ handle: "create" },
							{ handle: "jordan" },
						];
					},
				},
			},
		} as unknown as DatabaseClient;

		assert.deepEqual(await listSitemapHandles(db), ["avery", "jordan"]);
		assert.deepEqual(queryOptions?.columns, { handle: true });
		const where = new PgDialect().sqlToQuery(queryOptions?.where as never).sql;
		assert.equal(where, '("pages"."deletion_scheduled_at" is null)');
		assert.ok(queryOptions?.orderBy);
	});

	/**
	 * Case ID: PAGE-LIFECYCLE-001
	 * Given: Pro expired and the account has a primary page.
	 * When: the account lifecycle is reconciled.
	 * Then: extra pages receive a seven-day deadline and the primary page stays unscheduled.
	 * Evidence: captured page updates contain the deadline and null primary cleanup.
	 * Result: Pass | Fail | Blocked | Not Run
	 */
	it("PAGE-LIFECYCLE-001 schedules only extra pages after Pro expires", async () => {
		const now = new Date("2026-09-27T00:00:00.000Z");
		const periodEnd = new Date("2026-09-26T00:00:00.000Z");
		const { db, updates } = makeDb({
			primaryPageHandle: "main",
			status: "canceled",
			periodEnd,
		});

		await reconcileUserPageLifecycle({
			db,
			userId: "user-1",
			proProductIds: ["pro-monthly"],
			now,
		});

		assert.equal(updates.length, 2);
		const scheduledAt = updates[0]?.deletionScheduledAt;
		assert.ok(scheduledAt instanceof Date);
		assert.equal(scheduledAt.toISOString(), "2026-10-03T00:00:00.000Z");
		assert.deepEqual(updates[1], { deletionScheduledAt: null });
	});

	/**
	 * Case ID: PAGE-LIFECYCLE-002
	 * Given: Pro is active after a renewal webhook.
	 * When: the account lifecycle is reconciled.
	 * Then: previous deletion deadlines are cleared.
	 * Evidence: the captured update clears deletionScheduledAt for the account.
	 * Result: Pass | Fail | Blocked | Not Run
	 */
	it("PAGE-LIFECYCLE-002 clears page deletion deadlines after renewal", async () => {
		const { db, updates } = makeDb({
			primaryPageHandle: "main",
			status: "active",
			periodEnd: new Date("2026-10-27T00:00:00.000Z"),
			cancelAtPeriodEnd: false,
		});

		await reconcileUserPageLifecycle({
			db,
			userId: "user-1",
			proProductIds: ["pro-monthly"],
			now: new Date("2026-09-27T00:00:00.000Z"),
		});

		assert.deepEqual(updates, [{ deletionScheduledAt: null }]);
	});

	/**
	 * Case ID: PAGE-LIFECYCLE-003
	 * Given: Creem confirms cancellation but the subscription row has no period end.
	 * When: the account lifecycle is reconciled.
	 * Then: extra pages get a grace period starting from the confirmed reconciliation time.
	 * Evidence: the captured deadline is exactly seven days after now.
	 * Result: Pass | Fail | Blocked | Not Run
	 */
	it("PAGE-LIFECYCLE-003 schedules a grace period when canceled data has no end date", async () => {
		const now = new Date("2026-09-27T00:00:00.000Z");
		const { db, updates } = makeDb({
			primaryPageHandle: "main",
			status: "canceled",
			periodEnd: null,
		});

		await reconcileUserPageLifecycle({
			db,
			userId: "user-1",
			proProductIds: ["pro-monthly"],
			now,
		});

		const scheduledAt = updates[0]?.deletionScheduledAt;
		assert.ok(scheduledAt instanceof Date);
		assert.equal(scheduledAt.toISOString(), "2026-10-04T00:00:00.000Z");
	});

	/**
	 * Case ID: PAGE-LIFECYCLE-004
	 * Given: Creem confirms cancellation at the end of a future billing period.
	 * When: the account lifecycle is reconciled before that end date.
	 * Then: extra pages show a deadline seven days after the period ends.
	 * Evidence: captured page updates contain the future deadline and null primary cleanup.
	 * Result: Pass | Fail | Blocked | Not Run
	 */
	it("PAGE-LIFECYCLE-004 schedules cleanup when cancellation is first requested", async () => {
		const now = new Date("2026-09-27T00:00:00.000Z");
		const periodEnd = new Date("2026-10-27T00:00:00.000Z");
		const { db, updates } = makeDb({
			primaryPageHandle: "main",
			status: "scheduled_cancel",
			periodEnd,
		});

		await reconcileUserPageLifecycle({
			db,
			userId: "user-1",
			proProductIds: ["pro-monthly"],
			now,
		});

		const scheduledAt = updates[0]?.deletionScheduledAt;
		assert.ok(scheduledAt instanceof Date);
		assert.equal(scheduledAt.toISOString(), "2026-11-03T00:00:00.000Z");
		assert.deepEqual(updates[1], { deletionScheduledAt: null });
	});
});
