import { execFileSync } from "node:child_process";
import { appendFileSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

export const WEB = `http://127.0.0.1:${process.env.FEATUREMAP_WEB_PORT ?? 3000}`;
export const API = `http://127.0.0.1:${process.env.FEATUREMAP_API_PORT ?? 3001}`;
export const ACCOUNT = "featuremap@example.com";
export const HANDLE = "featuremap-test";
export const STATE = path.join(
	process.env.HOME,
	".cache/grabbin-featuremap/owner-session.json",
);
export const CONTAINER = "grabbin-featuremap";
export const DB_NAME = "grabbin_featuremap";

export function db(sql) {
	return execFileSync(
		"docker",
		[
			"exec",
			CONTAINER,
			"psql",
			"-U",
			"postgres",
			"-d",
			DB_NAME,
			"-X",
			"-A",
			"-t",
			"-c",
			sql,
		],
		{ encoding: "utf8" },
	).trim();
}

export async function capture(page, directory, name) {
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

export function logAction(directory, action) {
	mkdirSync(directory, { recursive: true });
	appendFileSync(path.join(directory, "actions.md"), `${action}\n`);
}
