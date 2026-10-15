import assert from "node:assert/strict";
import {
	mkdirSync,
	mkdtempSync,
	readdirSync,
	readFileSync,
	rmSync,
	statSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, relative, resolve, sep } from "node:path";
import { parse } from "@babel/parser";
import type { ArchitectureContext } from "./context";

function hasGenericFolder(path: string) {
	return path
		.split(/[\\/]/)
		.some((part) => part === "state" || part === "contexts");
}

function moduleReferences(source: string) {
	const references: string[] = [];
	function literal(value: unknown) {
		if (
			value &&
			typeof value === "object" &&
			"type" in value &&
			value.type === "StringLiteral" &&
			"value" in value &&
			typeof value.value === "string"
		)
			references.push(value.value);
	}
	function visit(node: unknown) {
		if (!node || typeof node !== "object") return;
		if ("type" in node) {
			if (
				[
					"ImportDeclaration",
					"ExportNamedDeclaration",
					"ExportAllDeclaration",
					"ImportExpression",
				].includes(String(node.type)) &&
				"source" in node
			)
				literal(node.source);
			if (node.type === "TSImportType" && "argument" in node)
				literal(node.argument);
			if (node.type === "TSExternalModuleReference" && "expression" in node)
				literal(node.expression);
			if (
				node.type === "CallExpression" &&
				"callee" in node &&
				node.callee &&
				typeof node.callee === "object" &&
				"type" in node.callee &&
				(node.callee.type === "Import" ||
					(node.callee.type === "Identifier" &&
						"name" in node.callee &&
						node.callee.name === "require")) &&
				"arguments" in node &&
				Array.isArray(node.arguments)
			)
				literal(node.arguments[0]);
		}
		for (const child of Object.values(node)) {
			if (Array.isArray(child)) child.forEach(visit);
			else visit(child);
		}
	}
	visit(
		parse(source, {
			sourceType: "module",
			plugins: ["typescript", "jsx"],
			allowUndeclaredExports: true,
		}),
	);
	return references;
}

function importViolation(
	file: string,
	specifier: string,
	sourceDirectory: string,
) {
	const target = specifier.startsWith("@/")
		? resolve(sourceDirectory, specifier.slice(2))
		: specifier.startsWith(".")
			? resolve(dirname(file), specifier)
			: null;
	if (!target) return null;
	const targetPath = relative(sourceDirectory, target).split(sep).join("/");
	const importsFile = ["", ".ts", ".tsx"].some((extension) =>
		statSync(`${target}${extension}`, { throwIfNoEntry: false })?.isFile(),
	);
	for (
		let prefix = importsFile ? dirname(target) : target;
		prefix.startsWith(`${resolve(sourceDirectory)}${sep}`);
		prefix = dirname(prefix)
	) {
		if (
			hasGenericFolder(basename(prefix)) &&
			statSync(prefix, { throwIfNoEntry: false })?.isDirectory()
		) {
			return "use a behavior-named module beside its feature instead of state/ or contexts/.";
		}
	}
	const sourcePath = relative(sourceDirectory, file).split(sep).join("/");
	if (
		sourcePath.startsWith("features/") &&
		!sourcePath.startsWith("features/page/editor/") &&
		(targetPath === "features/page/editor" ||
			targetPath.startsWith("features/page/editor/"))
	) {
		return "keep editor internals inside features/page/editor; use features/page/bento-item, features/page/utils, or pass actions from the editor host.";
	}
	return null;
}

assert.equal(hasGenericFolder("page/editor/state/item.ts"), true);
assert.equal(hasGenericFolder("page/editor/contexts/item.ts"), true);
assert.equal(hasGenericFolder("components/contexts/item.ts"), true);
assert.equal(hasGenericFolder("page/editor/state-machine.ts"), false);
assert.deepEqual(
	moduleReferences(`
// import x from "ignored";
const text = 'import x from "ignored"';
import type { Item } from "one";
export { item } from "two";
const load = () => import("three");
type OtherItem = import("four").Item;
const legacy = require("five");
import old = require("six");
`),
	["one", "two", "three", "four", "five", "six"],
);
const fixtureRoot = resolve("/feature-boundary-fixture");
const fixtureFile = join(fixtureRoot, "features/rss/widget.tsx");
assert.ok(
	importViolation(fixtureFile, "@/features/page/editor/types", fixtureRoot),
);
assert.ok(importViolation(fixtureFile, "../page/editor/types", fixtureRoot));
assert.equal(
	importViolation(
		join(fixtureRoot, "components/page/editor/owner-page.tsx"),
		"@/features/page/editor/types",
		fixtureRoot,
	),
	null,
);
assert.equal(
	importViolation(fixtureFile, "@/features/page/bento-item", fixtureRoot),
	null,
);
assert.equal(
	importViolation(fixtureFile, "@/features/page/utils/media-crop", fixtureRoot),
	null,
);
assert.equal(
	importViolation(
		join(fixtureRoot, "features/page/editor/widget.tsx"),
		"./types",
		fixtureRoot,
	),
	null,
);

export function checkFeatureBoundaryRules(
	context: Pick<ArchitectureContext, "sourceDirectory" | "allFiles">,
) {
	const errors: string[] = [];
	function checkFolders(directory: string) {
		for (const entry of readdirSync(directory, { withFileTypes: true })) {
			if (!entry.isDirectory()) continue;
			const path = join(directory, entry.name);
			if (hasGenericFolder(entry.name)) {
				errors.push(
					`${relative(context.sourceDirectory, path)}: use behavior-named modules beside their feature instead of state/ or contexts/.`,
				);
			}
			checkFolders(path);
		}
	}
	checkFolders(context.sourceDirectory);
	for (const file of context.allFiles) {
		for (const specifier of moduleReferences(readFileSync(file, "utf8"))) {
			const violation = importViolation(
				file,
				specifier,
				context.sourceDirectory,
			);
			if (violation)
				errors.push(
					`${relative(context.sourceDirectory, file)}: ${specifier}: ${violation}`,
				);
		}
	}
	return errors;
}

const directoryFixture = mkdtempSync(join(tmpdir(), "feature-boundaries-"));
try {
	const components = join(directoryFixture, "components");
	mkdirSync(components);
	const caller = join(components, "widget.tsx");
	writeFileSync(join(components, "state.ts"), "export const state = 1;");
	writeFileSync(join(components, "contexts.ts"), "export const contexts = 1;");
	writeFileSync(
		caller,
		'import { state } from "./state"; import { contexts } from "./contexts.ts";',
	);
	const context = { sourceDirectory: directoryFixture, allFiles: [caller] };
	assert.deepEqual(checkFeatureBoundaryRules(context), []);
	assert.deepEqual(
		checkFeatureBoundaryRules({
			...context,
			sourceDirectory: `${directoryFixture}${sep}`,
		}),
		[],
	);
	mkdirSync(join(components, "state"));
	mkdirSync(join(components, "contexts"));
	assert.equal(importViolation(caller, "./state", directoryFixture), null);
	assert.equal(importViolation(caller, "./contexts", directoryFixture), null);
	rmSync(join(components, "contexts.ts"));
	writeFileSync(caller, 'import "./state/item"; import "./contexts";');
	const errors = checkFeatureBoundaryRules(context);
	assert.equal(errors.length, 4);
	assert.deepEqual(
		checkFeatureBoundaryRules({
			...context,
			sourceDirectory: `${directoryFixture}${sep}`,
		}),
		errors,
	);
	assert.ok(errors.some((error) => error.startsWith("components/contexts:")));
	assert.ok(
		errors.some((error) => error.includes("widget.tsx: ./state/item:")),
	);
	assert.ok(errors.some((error) => error.includes("widget.tsx: ./contexts:")));
} finally {
	rmSync(directoryFixture, { recursive: true, force: true });
}
