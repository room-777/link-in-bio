import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { ArchitectureContext } from "./context";

function fetchPrefixedFunctions(source: string) {
	return [
		...source.matchAll(
			/\b(?:function\s+|(?:const|let|var)\s+)(fetch[\w$]*)\b/g,
		),
	].map(([, name]) => name);
}

assert.deepEqual(
	fetchPrefixedFunctions(
		"export function fetchPage() {} const fetchDomain = async () => {};",
	),
	["fetchPage", "fetchDomain"],
);

export function checkRequestBoundaryRules(context: ArchitectureContext) {
	const errors: string[] = [];
	const externalFetchFiles = new Set([
		join(context.featureDirectory, "tweet/queries/by-id.ts"),
		join(context.sourceDirectory, "lib/mapbox-geocoding.ts"),
		join(
			context.featureDirectory,
			"page/profile/mutations/upload-profile-image.ts",
		),
		join(context.mutationDirectory, "bento/upload-media.ts"),
	]);

	for (const path of context.allFiles) {
		const source = readFileSync(path, "utf8");
		const relativePath = path.slice(context.sourceDirectory.length + 1);
		const inQuery = context.queryFileSet.has(path);
		const inMutation = context.mutationFileSet.has(path);

		if (fetchPrefixedFunctions(source).length > 0) {
			errors.push(
				`${relativePath}: use a behavior-specific verb instead of a fetch-prefixed function name.`,
			);
		}
		if (/\bfetch\s*\(/.test(source) && !externalFetchFiles.has(path)) {
			errors.push(
				`${relativePath}: use apiClient for app-server requests; direct fetch is limited to external services and signed uploads.`,
			);
		}
		if (!inQuery && !inMutation && /\bapiClient\s*(?:\.|\[)/.test(source)) {
			errors.push(
				`${relativePath}: call apiClient only from query or mutation modules.`,
			);
		}
		if (!inMutation && /\buseMutation\s*\(/.test(source)) {
			errors.push(
				`${relativePath}: mutation hooks belong in mutation modules.`,
			);
		}
		if (
			!inQuery &&
			/\buse(?:Suspense)?(?:Infinite)?(?:Queries|Query)\s*\(/.test(source)
		) {
			errors.push(`${relativePath}: query hooks belong in query modules.`);
		}
		if (!inQuery && /queryKey\s*:\s*\[/.test(source)) {
			errors.push(
				`${relativePath}: define query keys in query modules and import them when shared.`,
			);
		}
		if (/from\s+["']@\/api\//.test(source)) {
			errors.push(
				`${relativePath}: move server calls into the matching query or mutation module.`,
			);
		}
	}

	return errors;
}
