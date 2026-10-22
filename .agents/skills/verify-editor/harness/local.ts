import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { Page } from "@playwright/test";
import pg from "pg";
import { dbUrl, readStack, SCREENSHOTS_DIR } from "./stack.ts";

const STACK = readStack(process.env);
export const WEB = `http://127.0.0.1:${STACK.ports.web}`;
export const API = `http://127.0.0.1:${STACK.ports.api}`;
export const ACCOUNT = "featuremap@example.com";
export const HANDLE = "featuremap-test";
// The same address the API and migrations use, so a test reads the database
// the app writes (never a container reached another way).
const pool = new pg.Pool({
	connectionString: dbUrl(STACK.ports.db),
	max: 2,
	allowExitOnIdle: true,
	// Postgres' own text for every type, the same text psql prints.
	types: { getTypeParser: () => (value: string) => value },
});

export const sql = (value: string) => `'${value.replaceAll("'", "''")}'`;

/** One query against the run's database, printed as psql -A -t prints it. */
export async function db(query: string): Promise<string> {
	const result = await pool.query({ text: query, rowMode: "array" });
	const last = Array.isArray(result) ? result.at(-1) : result;
	return (last?.rows ?? [])
		.map((row: (string | null)[]) => row.map((value) => value ?? "").join("|"))
		.join("\n");
}

export const redacted = (value: unknown) =>
	String(value).replaceAll(ACCOUNT, "[local test account]");

/** Screenshot plus ARIA snapshot under featuremap-results/screenshots/<feature>/. */
export async function proof(page: Page, feature: string, name: string) {
	const directory = path.join(SCREENSHOTS_DIR, feature);
	mkdirSync(directory, { recursive: true });
	await page.screenshot({
		path: path.join(directory, `${name}.png`),
		fullPage: true,
	});
	writeFileSync(
		path.join(directory, `${name}.aria.txt`),
		await page.locator("body").ariaSnapshot(),
	);
}
