import { execFile } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import type { Page } from "@playwright/test";

export const ROOT = fileURLToPath(new URL("../../../../", import.meta.url));
export const RESULTS_DIR = path.join(ROOT, "featuremap-results");
export const LOGS_DIR = path.join(RESULTS_DIR, "logs");
export const SCREENSHOTS_DIR = path.join(RESULTS_DIR, "screenshots");
export const WEB = `http://127.0.0.1:${process.env.FEATUREMAP_WEB_PORT ?? 3000}`;
export const API = `http://127.0.0.1:${process.env.FEATUREMAP_API_PORT ?? 3001}`;
export const ACCOUNT = "featuremap@example.com";
export const HANDLE = "featuremap-test";
const DB_PORT = process.env.FEATUREMAP_DB_PORT ?? "15432";
const DEFAULT_PORT = DB_PORT === "15432";
// Same per-port names start-local.sh gives the stack's DB container and its
// state directory, so concurrent stacks never share them.
export const CONTAINER = DEFAULT_PORT
	? "grabbin-featuremap"
	: `grabbin-featuremap-${DB_PORT}`;
export const STATE_DIR = path.join(
	process.env.HOME ?? "",
	".cache/grabbin-featuremap",
	DEFAULT_PORT ? "" : DB_PORT,
);
const execFileAsync = promisify(execFile);

export const sql = (value: string) => `'${value.replaceAll("'", "''")}'`;

/** One psql round trip against the stack's own labeled database container. */
export async function db(query: string): Promise<string> {
	const { stdout } = await execFileAsync(
		"docker",
		[
			"exec",
			CONTAINER,
			"psql",
			"-U",
			"postgres",
			"-d",
			"grabbin_featuremap",
			"-X",
			"-A",
			"-t",
			"-v",
			"ON_ERROR_STOP=1",
			"-c",
			query,
		],
		{ encoding: "utf8" },
	);
	return stdout.trim();
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
