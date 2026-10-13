import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { basename } from "node:path";
import type { ArchitectureContext } from "./context";
import { relativeToDomain } from "./context";

function queryOperations(source: string) {
	return new Set(
		[
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
			),
	);
}

function queryKeyArrays(source: string) {
	return [
		...source.matchAll(/queryKey\s*:\s*(\[[\s\S]*?\])\s*(?:as\s+const)?/g),
	].map(([, value]) => value.replace(/\s+/g, ""));
}

assert.deepEqual(
	[
		...queryOperations(
			"export function getPageByHandleQueryOptions() {} export function useSuspensePageByHandleQuery() {}",
		),
	],
	["PageByHandle"],
);

export function checkQueryRules(context: ArchitectureContext) {
	const errors: string[] = [];
	const queryKeys = new Map<string, string>();

	for (const path of context.queryFiles) {
		const source = readFileSync(path, "utf8");
		const relativePath = relativeToDomain(
			context,
			path,
			context.queryDirectory,
		);
		if (basename(path) === "query.ts") {
			errors.push(`${relativePath}: use a behavior-specific filename.`);
		}
		if (queryOperations(source).size > 1) {
			errors.push(`${relativePath}: define one query operation per file.`);
		}
		if (/useMutation\s*(?:,|\s*\})/.test(source)) {
			errors.push(
				`${relativePath}: mutation hooks belong in feature mutation modules.`,
			);
		}
		for (const key of queryKeyArrays(source)) {
			const previous = queryKeys.get(key);
			if (previous)
				errors.push(`${relativePath}: queryKey duplicates ${previous}.`);
			else queryKeys.set(key, relativePath);
		}
	}

	return errors;
}
