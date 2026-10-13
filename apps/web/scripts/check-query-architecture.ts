import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { basename, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

function filesUnder(directory: string) {
	const files: string[] = [];
	for (const entry of readdirSync(directory, { withFileTypes: true })) {
		const path = join(directory, entry.name);
		if (entry.isDirectory()) files.push(...filesUnder(path));
		else if (/\.tsx?$/.test(entry.name) && !entry.name.endsWith(".d.ts")) {
			files.push(path);
		}
	}
	return files;
}

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

function mutationHooks(source: string) {
	return [
		...source.matchAll(/\bexport\s+(?:async\s+)?function\s+(use\w+)\b/g),
	].map(([, name]) => name);
}

function exportedComponents(source: string) {
	const names = new Set(
		[
			...source.matchAll(
				/\bexport\s+(?:default\s+)?(?:async\s+)?function\s+([A-Z][\w]*)/g,
			),
		].map(([, name]) => name),
	);
	for (const match of source.matchAll(
		/\bexport\s+const\s+([A-Z][a-z][\w]*)\s*=/g,
	)) {
		const start = match.index ?? 0;
		const nextExport = source.indexOf("\nexport ", start + match[0].length);
		const declaration = source.slice(
			start,
			nextExport < 0 ? undefined : nextExport,
		);
		if (
			/=>\s*\(?\s*[\s\S]{0,40}</.test(declaration) ||
			/createLucideIcon\s*\(/.test(declaration)
		) {
			names.add(match[1]);
		}
	}
	return [...names];
}

function kebabCase(name: string) {
	return name.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
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
assert.deepEqual(mutationHooks("export function useDeletePageMutation() {}"), [
	"useDeletePageMutation",
]);
assert.deepEqual(
	exportedComponents("export default function PageHeader() {}"),
	["PageHeader"],
);
assert.equal(kebabCase("PageHeader"), "page-header");

const sourceDirectory = fileURLToPath(new URL("../src/", import.meta.url));
const queryDirectory = join(sourceDirectory, "query");
const mutationDirectory = join(sourceDirectory, "mutation");
const componentDirectory = join(sourceDirectory, "components");
const errors: string[] = [];
const queryKeys = new Map<string, string>();
const externalFetchFiles = new Set([
	join(queryDirectory, "tweet/by-id.ts"),
	join(sourceDirectory, "lib/mapbox-geocoding.ts"),
	join(mutationDirectory, "page-profile-image/upload.ts"),
	join(mutationDirectory, "bento/upload-media.ts"),
]);

for (const path of filesUnder(queryDirectory)) {
	const source = readFileSync(path, "utf8");
	const relativePath = relative(queryDirectory, path);
	if (basename(path) === "query.ts") {
		errors.push(`${relativePath}: use a behavior-specific filename.`);
	}
	if (queryOperations(source).size > 1) {
		errors.push(`${relativePath}: define one query operation per file.`);
	}
	if (/useMutation\s*(?:,|\s*\})/.test(source)) {
		errors.push(`${relativePath}: mutation hooks belong in src/mutation.`);
	}
	for (const key of queryKeyArrays(source)) {
		const previous = queryKeys.get(key);
		if (previous)
			errors.push(`${relativePath}: queryKey duplicates ${previous}.`);
		else queryKeys.set(key, relativePath);
	}
}

for (const path of filesUnder(mutationDirectory)) {
	const source = readFileSync(path, "utf8");
	const relativePath = relative(mutationDirectory, path);
	if (basename(path) === "mutation.ts") {
		errors.push(`${relativePath}: use a behavior-specific filename.`);
	}
	if (mutationHooks(source).length !== 1) {
		errors.push(`${relativePath}: export exactly one mutation hook.`);
	}
	if (
		/\b(?:queryOptions|infiniteQueryOptions|useQuery|useSuspenseQuery|useQueries|useSuspenseQueries|useInfiniteQuery|useSuspenseInfiniteQuery)\b/.test(
			source,
		)
	) {
		errors.push(
			`${relativePath}: query definitions and hooks belong in src/query.`,
		);
	}
	if (/queryKey\s*:\s*\[/.test(source)) {
		errors.push(`${relativePath}: import query keys from their query module.`);
	}
}

for (const path of filesUnder(sourceDirectory)) {
	const source = readFileSync(path, "utf8");
	const relativePath = relative(sourceDirectory, path);
	const inQuery = path.startsWith(`${queryDirectory}/`);
	const inMutation = path.startsWith(`${mutationDirectory}/`);
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
		errors.push(`${relativePath}: mutation hooks belong in src/mutation.`);
	}
	if (!inQuery && /queryKey\s*:\s*\[/.test(source)) {
		errors.push(
			`${relativePath}: define query keys in src/query and import them when shared.`,
		);
	}
	if (/from\s+["']@\/api\//.test(source)) {
		errors.push(
			`${relativePath}: move server calls into the matching query or mutation file.`,
		);
	}
}

for (const path of filesUnder(componentDirectory)) {
	const names = exportedComponents(readFileSync(path, "utf8"));
	if (names.length === 0) continue;
	const relativePath = relative(componentDirectory, path);
	const expectedName = kebabCase(names[0]);
	const actualName = basename(path).replace(/\.tsx$/, "");
	if (names.length !== 1) {
		errors.push(`${relativePath}: export one component per file.`);
	}
	if (names.length === 1 && actualName !== expectedName) {
		errors.push(
			`${relativePath}: filename must match ${names[0]} (${expectedName}.tsx).`,
		);
	}
}

if (errors.length > 0) {
	console.error(errors.join("\n"));
	process.exitCode = 1;
} else {
	console.log("Web query and mutation architecture check passed.");
}
