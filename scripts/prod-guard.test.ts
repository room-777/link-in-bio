import { describe, expect, test } from "bun:test";
import {
	assertLocalR2Credentials,
	assertLocalTestDatabase,
	assertNoProductionEnvironment,
	ProductionResourceError,
} from "@grabbin/env/prod-guard";

describe("production guard", () => {
	test("accepts a local throwaway database and rejects anything else", () => {
		const db = "grabbin_smoke_test";
		expect(() =>
			assertLocalTestDatabase(`postgres://u:p@127.0.0.1:5432/${db}`, db),
		).not.toThrow();
		for (const url of [
			`postgres://u:p@db.abc.supabase.co:5432/${db}`,
			"postgres://u:p@127.0.0.1:5432/postgres",
			"not a url",
		])
			expect(() => assertLocalTestDatabase(url, db)).toThrow(
				ProductionResourceError,
			);
	});

	test("rejects R2 credentials for a real Cloudflare endpoint", () => {
		const local = { endpoint: "http://localhost:1337/cdn-cgi/local/r2/s3" };
		const remote = { endpoint: "https://abc.r2.cloudflarestorage.com" };
		expect(() => assertLocalR2Credentials(JSON.stringify(local))).not.toThrow();
		expect(() => assertLocalR2Credentials(JSON.stringify(remote))).toThrow(
			ProductionResourceError,
		);
	});

	test("rejects production markers in the environment without printing them", () => {
		expect(() =>
			assertNoProductionEnvironment({
				GA_TEST_DATABASE_URL: "postgres://u:p@localhost:5432/grabbin_ga_test",
			}),
		).not.toThrow();
		expect(() =>
			assertNoProductionEnvironment({ NODE_ENV: "production" }),
		).toThrow(ProductionResourceError);
		expect(() =>
			assertNoProductionEnvironment({
				BILLING_TEST_DATABASE_URL:
					"postgres://u:secret@x.pooler.supabase.com/db",
			}),
		).toThrow(/BILLING_TEST_DATABASE_URL points at a production host/);
		try {
			assertNoProductionEnvironment({
				R2_BUCKET_URL:
					"https://abc.r2.cloudflarestorage.com/grabbin?key=secret",
			});
		} catch (error) {
			expect(String(error)).not.toContain("secret");
		}
	});
});
