/**
 * GA4 server events against a throwaway local database (GA-SRV-*).
 * Set GA_TEST_DATABASE_URL to e.g.
 * postgres://postgres:postgres@127.0.0.1:54322/grabbin_ga_test.
 * Never point this at a shared or production database: it drops all tables.
 * GA itself is never called; fetch is a test double.
 */
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { after, before, beforeEach, describe, it } from "node:test";
import {
	createServerEventTracker,
	type GoogleAnalyticsConfig,
	readTimeSinceSignup,
} from "@grabbin/auth/google-analytics";
import type { DatabaseClient } from "@grabbin/db";
import { drizzle } from "@grabbin/db/drizzle";
import * as schema from "@grabbin/db/schema/index";
import { Client } from "pg";

const url = process.env.GA_TEST_DATABASE_URL;
const local =
	!!url && /@(127\.0\.0\.1|localhost):\d+\/grabbin_ga_test$/.test(url);
const MIGRATION = "0016_ga_analytics_events.sql";
const config: GoogleAnalyticsConfig = {
	measurementId: "G-TEST123",
	apiSecret: "test-secret-not-real",
	mode: "validate",
};
const cookie =
	"_ga=GA1.1.111.222; _ga_TEST123=GS2.1.s1760000000$o3$g1$t1760000100; grabbin_ga_internal=1";

let client: Client;
let db: DatabaseClient;

function migrationStatements(file: string) {
	const dir = join(
		import.meta.dirname,
		"../../../../packages/db/src/migrations",
	);
	return readFileSync(join(dir, file), "utf8")
		.split("--> statement-breakpoint")
		.filter((statement) => statement.trim());
}

async function migrate(until?: string) {
	await client.query(
		"discard temp; drop schema if exists public cascade; create schema public;",
	);
	const dir = join(
		import.meta.dirname,
		"../../../../packages/db/src/migrations",
	);
	for (const file of readdirSync(dir)
		.filter((f) => f.endsWith(".sql"))
		.sort()) {
		if (until && file >= until) break;
		for (const statement of migrationStatements(file))
			await client.query(statement);
	}
}

async function insertUser(id: string, createdAt = new Date()) {
	await client.query(
		`insert into "user" (id, name, email, created_at, updated_at) values ($1, $1, $1 || '@example.com', $2, $2)`,
		[id, createdAt],
	);
}

/** The test connection, kept open when the tracker "closes" it. */
function sharedDb() {
	return Object.assign(Object.create(db), {
		$client: { end: async () => undefined },
	}) as DatabaseClient;
}

function createTracker() {
	const calls: Array<{ url: string; body: Record<string, unknown> }> = [];
	const logs: Array<[string, Record<string, unknown>]> = [];
	const tasks: Promise<unknown>[] = [];
	const tracker = createServerEventTracker({
		config,
		createDb: async () => sharedDb(),
		waitUntil: (task) => tasks.push(task),
		fetch: (async (input: URL | string, init?: RequestInit) => {
			calls.push({
				url: String(input),
				body: JSON.parse(String(init?.body)),
			});
			return new Response('{"validationMessages":[]}', { status: 200 });
		}) as typeof fetch,
		log: (message, detail) => logs.push([message, detail]),
	});
	return { tracker, calls, logs, tasks };
}

const headers = new Headers({ cookie });

type SentEvent = { name: string; params: Record<string, unknown> };
function sentEvent(call: { body: Record<string, unknown> } | undefined) {
	return (call?.body.events as SentEvent[] | undefined)?.[0];
}

describe("GA server events against local Postgres", { skip: !local }, () => {
	before(async () => {
		client = new Client({ connectionString: url });
		await client.connect();
		db = drizzle({ client, schema }) as unknown as DatabaseClient;
	});
	after(async () => {
		await client?.end();
	});
	beforeEach(async () => {
		await migrate();
	});

	/**
	 * Case ID: GA-SRV-001
	 * Given: a user with a page and items exists before the migration.
	 * When: the GA migration runs.
	 * Then: sign_up, page_created and first_link_added are marked as sent for
	 *   that user, so none is reported later; running the backfill twice is safe.
	 * Evidence: analytics_events rows after the migration.
	 * Result: Pass | Fail | Blocked | Not Run
	 */
	it("GA-SRV-001 marks events of existing accounts as already sent", async () => {
		await migrate(MIGRATION);
		await insertUser("old-user", new Date("2026-01-01T00:00:00Z"));
		await insertUser("no-page-user");
		await client.query(
			`insert into pages (id, user_id, handle) values ('p1', 'old-user', 'old')`,
		);
		await client.query(
			`insert into page_items (id, page_id, type, data, style, layouts) values ('i1', 'p1', 'link', '{}', '{}', '{}')`,
		);
		for (const statement of migrationStatements(MIGRATION))
			await client.query(statement);
		// The backfill inserts are idempotent.
		for (const statement of migrationStatements(MIGRATION).slice(2))
			await client.query(statement);

		const { rows } = await client.query(
			"select user_id, event_name from analytics_events order by user_id, event_name",
		);
		assert.deepEqual(rows, [
			{ user_id: "no-page-user", event_name: "sign_up" },
			{ user_id: "old-user", event_name: "first_link_added" },
			{ user_id: "old-user", event_name: "page_created" },
			{ user_id: "old-user", event_name: "sign_up" },
		]);
		const { tracker, calls } = createTracker();
		const result = await tracker.trackSignIn({
			userId: "old-user",
			headers,
			method: "email",
		});
		assert.equal(result.sent, true);
		assert.equal(sentEvent(calls[0])?.name, "login");
	});

	/**
	 * Case ID: GA-SRV-002
	 * Given: a new account with GA cookies and the internal flag.
	 * When: it signs in twice.
	 * Then: the first session sends sign_up and the second sends login, both
	 *   to the validation endpoint with the browser ids, user_id, user_type
	 *   creator, traffic_type internal and the sign-in method.
	 * Evidence: fetch URL and JSON body, analytics_events rows.
	 * Result: Pass | Fail | Blocked | Not Run
	 */
	it("GA-SRV-002 sends sign_up once, then login", async () => {
		await insertUser("new-user");
		const { tracker, calls, tasks } = createTracker();
		await tracker.trackSignIn({
			userId: "new-user",
			headers,
			method: "google",
		});
		await tracker.trackSignIn({ userId: "new-user", headers, method: "email" });
		assert.equal(tasks.length, 2);

		assert.equal(calls.length, 2);
		const sent = new URL(calls[0]?.url ?? "");
		assert.equal(
			sent.origin + sent.pathname,
			"https://www.google-analytics.com/debug/mp/collect",
		);
		assert.equal(sent.searchParams.get("measurement_id"), "G-TEST123");
		assert.deepEqual(calls[0]?.body, {
			client_id: "111.222",
			user_id: "new-user",
			user_properties: { user_type: { value: "creator" } },
			events: [
				{
					name: "sign_up",
					params: {
						method: "google",
						session_id: 1760000000,
						traffic_type: "internal",
						engagement_time_msec: 1,
					},
				},
			],
		});
		const second = sentEvent(calls[1]);
		assert.equal(second?.name, "login");
		assert.equal(second?.params.method, "email");
	});

	/**
	 * Case ID: GA-SRV-003
	 * Given: a new account that creates its page and saves items.
	 * When: page_created and first_link_added are tracked twice each (a retry).
	 * Then: each is sent once; the retry is suppressed by the database.
	 * Evidence: fetch call count/body, tracker results, analytics_events rows.
	 * Result: Pass | Fail | Blocked | Not Run
	 */
	it("GA-SRV-003 sends once-only events a single time", async () => {
		await insertUser("creator", new Date(Date.now() - 90_000));
		const { tracker, calls } = createTracker();
		const pageCreated = () =>
			tracker.track({
				name: "page_created",
				once: "page_created",
				userId: "creator",
				headers,
				params: (database) => readTimeSinceSignup(database, "creator"),
			});
		const firstLink = () =>
			tracker.track({
				name: "first_link_added",
				once: "first_link_added",
				userId: "creator",
				headers,
				params: { item_type: "link" },
			});
		const results = await Promise.all([pageCreated(), pageCreated()]);
		assert.deepEqual(results.map((r) => r.sent).sort(), [false, true]);
		assert.equal((await firstLink()).sent, true);
		assert.deepEqual(await firstLink(), {
			sent: false,
			reason: "already_sent",
		});

		assert.deepEqual(
			calls.map((call) => sentEvent(call)?.name),
			["page_created", "first_link_added"],
		);
		const params = sentEvent(calls[0])?.params as
			| { time_since_signup_sec: number }
			| undefined;
		assert.ok(
			params &&
				params.time_since_signup_sec >= 89 &&
				params.time_since_signup_sec < 120,
		);
	});

	/**
	 * Case ID: GA-SRV-004
	 * Given: GA is unreachable.
	 * When: an event is tracked.
	 * Then: the tracker resolves without throwing and logs the failure without
	 *   the API secret.
	 * Evidence: tracker result and log entries.
	 * Result: Pass | Fail | Blocked | Not Run
	 */
	it("GA-SRV-004 never throws when GA fails", async () => {
		await insertUser("offline");
		const logs: Array<[string, Record<string, unknown>]> = [];
		const tracker = createServerEventTracker({
			config,
			createDb: async () => sharedDb(),
			waitUntil: () => undefined,
			fetch: (async () => {
				throw new Error("network down");
			}) as typeof fetch,
			log: (message, detail) => logs.push([message, detail]),
		});
		assert.deepEqual(
			await tracker.track({
				name: "page_created",
				once: "page_created",
				userId: "offline",
			}),
			{ sent: false, reason: "error" },
		);
		assert.equal(logs[0]?.[0], "ga server event failed");
		assert.ok(!JSON.stringify(logs).includes(config.apiSecret));
	});

	/**
	 * Case ID: GA-SRV-005
	 * Given: GA fails (network error, then a 500) for a once-only event.
	 * When: the event is tracked again after each failure.
	 * Then: failures release the claim, so the next attempt sends it; once it
	 *   is delivered, later attempts are skipped.
	 * Evidence: tracker results, fetch count and analytics_events rows.
	 * Result: Pass | Fail | Blocked | Not Run
	 */
	it("GA-SRV-005 keeps a failed once-only event retryable", async () => {
		await insertUser("retry");
		const responses: Array<() => Response> = [
			() => {
				throw new Error("network down");
			},
			() => new Response("server error", { status: 500 }),
			() => new Response("", { status: 204 }),
		];
		let fetches = 0;
		const tracker = createServerEventTracker({
			config: { ...config, mode: "collect" },
			createDb: async () => sharedDb(),
			waitUntil: () => undefined,
			fetch: (async () => {
				fetches += 1;
				return (responses.shift() ?? responses[0])?.() ?? new Response("");
			}) as typeof fetch,
			log: () => undefined,
		});
		const firstLink = () =>
			tracker.track({
				name: "first_link_added",
				once: "first_link_added",
				userId: "retry",
				params: { item_type: "link" },
			});
		const rows = async () =>
			(
				await client.query(
					`select count(*)::int as n from analytics_events where user_id = 'retry'`,
				)
			).rows[0]?.n;

		assert.deepEqual(await firstLink(), { sent: false, reason: "error" });
		assert.equal(await rows(), 0);
		assert.deepEqual(await firstLink(), { sent: false, reason: "error" });
		assert.equal(await rows(), 0);
		assert.equal((await firstLink()).sent, true);
		assert.equal(await rows(), 1);
		assert.deepEqual(await firstLink(), {
			sent: false,
			reason: "already_sent",
		});
		assert.equal(fetches, 3);
	});
});
