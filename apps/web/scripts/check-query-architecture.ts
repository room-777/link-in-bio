import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

function queryOperations(source: string) {
	const names = [
		...source.matchAll(
			/\bexport\s+(?:async\s+)?(?:function|const)\s+([\w$]+)/g,
		),
	]
		.map(([, name]) => name)
		.filter((name) => /^(?:get.*QueryOptions|use.*Query)$/.test(name))
		.map((name) =>
			name
				.replace(/^get/, "")
				.replace(/^useSuspense/, "")
				.replace(/^use/, "")
				.replace(/QueryOptions$/, "")
				.replace(/Query$/, ""),
		);
	return new Set(names);
}

assert.deepEqual(
	[
		...queryOperations(`
			export function getPageByHandleQueryOptions() {}
			export function useSuspensePageByHandleQuery() {}
		`),
	],
	["PageByHandle"],
);
assert.equal(
	queryOperations(`
		export function getPageByHandleQueryOptions() {}
		export function getOwnedPagesQueryOptions() {}
	`).size,
	2,
);

const queryDirectory = fileURLToPath(new URL("../src/query/", import.meta.url));
const errors: string[] = [];

function visit(directory: string) {
	for (const entry of readdirSync(directory, { withFileTypes: true })) {
		const path = join(directory, entry.name);
		if (entry.isDirectory()) {
			visit(path);
			continue;
		}
		if (!/\.tsx?$/.test(entry.name) || entry.name.endsWith(".d.ts")) continue;
		if (entry.name === "query.ts") {
			errors.push(
				`${relative(queryDirectory, path)}: use a behavior-specific filename.`,
			);
		}
		const operations = queryOperations(readFileSync(path, "utf8"));
		if (operations.size > 1) {
			errors.push(
				`${relative(queryDirectory, path)}: define one query per file; split queries into behavior-specific files.`,
			);
		}
	}
}

visit(queryDirectory);
if (errors.length > 0) {
	console.error(errors.join("\n"));
	process.exitCode = 1;
} else {
	console.log("Web query architecture check passed.");
}
