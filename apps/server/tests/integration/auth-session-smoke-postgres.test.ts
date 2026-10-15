/**
 * Login/session smoke test against a throwaway local database (AUTH-SMOKE-*).
 * It runs the real server app, the real Better Auth setup and the real
 * Drizzle adapter, so a get-session crash like the one after #10 fails here.
 *
 * Set AUTH_SMOKE_TEST_DATABASE_URL to e.g.
 * postgres://postgres:postgres@127.0.0.1:55432/grabbin_smoke_test.
 * Any other host or database name stops the test: it drops all tables.
 * Run this file on its own (the CI auth-smoke job does): other test files
 * mock the same Worker modules in the shared bun test process.
 * Email is a test double; GA and Creem have no keys, so they are never called.
 */
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { after, before, describe, it } from "node:test";
import { assertLocalTestDatabase } from "@grabbin/env/prod-guard";
import { Client } from "pg";

const url = process.env.AUTH_SMOKE_TEST_DATABASE_URL;
if (url) assertLocalTestDatabase(url, "grabbin_smoke_test");

const SERVER_ORIGIN = "http://localhost:3001";
const WEB_ORIGIN = "http://localhost:3000";
const email = "smoke-user@example.com";
const sentOtps = new Map<string, string>();

async function migrate(connectionString: string) {
	const client = new Client({ connectionString });
	await client.connect();
	try {
		await client.query(
			"drop schema if exists public cascade; create schema public;",
		);
		const dir = join(
			import.meta.dirname,
			"../../../../packages/db/src/migrations",
		);
		for (const file of readdirSync(dir)
			.filter((f) => f.endsWith(".sql"))
			.sort())
			for (const statement of readFileSync(join(dir, file), "utf8")
				.split("--> statement-breakpoint")
				.filter((s) => s.trim()))
				await client.query(statement);
	} finally {
		await client.end();
	}
}

function cookiesFrom(response: Response) {
	return response.headers
		.getSetCookie()
		.map((cookie) => cookie.split(";")[0])
		.join("; ");
}

describe("login and session smoke test", { skip: !url }, () => {
	let request: (path: string, init?: RequestInit) => Promise<Response>;

	before(async () => {
		await migrate(url as string);
		const { mock } = require("bun:test") as {
			mock: { module: (specifier: string, factory: () => unknown) => void };
		};
		mock.module("cloudflare:workers", () => ({
			env: {
				HYPERDRIVE: { connectionString: url },
				BETTER_AUTH_SECRET: "smoke-test-secret-smoke-test-secret",
				BETTER_AUTH_URL: SERVER_ORIGIN,
				CORS_ORIGIN: WEB_ORIGIN,
				CREEM_TEST_MODE: "true",
			},
			waitUntil: () => {},
		}));
		mock.module("@grabbin/email", () => ({
			sendVerificationOTP: async (input: { email: string; otp: string }) => {
				sentOtps.set(input.email, input.otp);
			},
			sendDeleteAccountVerification: async () => {},
		}));
		const app = (await import("../../src/index")).default;
		request = async (path, init) =>
			await app.request(
				`${SERVER_ORIGIN}${path}`,
				{
					...init,
					headers: { origin: WEB_ORIGIN, ...init?.headers },
				},
				{},
			);
	});

	after(() => {
		sentOtps.clear();
	});

	/**
	 * Case ID: AUTH-SMOKE-001
	 * Given: an empty local database with every migration applied.
	 * When: a visitor without a cookie calls GET /auth/get-session.
	 * Then: 200 with a null session, not a server error.
	 * Evidence: HTTP status and body.
	 * Result: Pass | Fail | Blocked | Not Run
	 */
	it("AUTH-SMOKE-001 answers get-session without a cookie", async () => {
		const response = await request("/auth/get-session");
		assert.equal(response.status, 200);
		assert.equal(await response.json(), null);
	});

	/**
	 * Case ID: AUTH-SMOKE-002
	 * Given: the same database and a captured email OTP.
	 * When: the user signs in with the OTP, then calls get-session with the
	 *   returned cookie (cookie cache off, so the database path runs).
	 * Then: sign-in and get-session both return 200, and the session carries
	 *   the user, the page handle field and the plan.
	 * Evidence: HTTP statuses, session body.
	 * Result: Pass | Fail | Blocked | Not Run
	 */
	it("AUTH-SMOKE-002 signs in and reads the session", async () => {
		const send = await request("/auth/email-otp/send-verification-otp", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ email, type: "sign-in" }),
		});
		assert.equal(send.status, 200, await send.clone().text());
		const otp = sentOtps.get(email);
		assert.ok(otp, "the OTP email was not captured");

		const signIn = await request("/auth/sign-in/email-otp", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ email, otp }),
		});
		assert.equal(signIn.status, 200, await signIn.clone().text());
		const cookie = cookiesFrom(signIn);
		assert.match(cookie, /session_token=/);

		const session = await request("/auth/get-session?disableCookieCache=true", {
			headers: { cookie },
		});
		assert.equal(session.status, 200, await session.clone().text());
		const body = (await session.json()) as {
			user: { email: string; pageHandle: string | null };
			plan: { tier: string };
		};
		assert.equal(body.user.email, email);
		assert.equal(body.user.pageHandle, null);
		assert.equal(typeof body.plan.tier, "string");
	});
});
