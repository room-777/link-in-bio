import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import ts from "typescript";
import type { ArchitectureContext } from "./context";

function hasGenericFolder(path: string) {
	return path
		.split(/[\\/]/)
		.some((part) => part === "state" || part === "contexts");
}

function moduleReferences(source: string) {
	const references: string[] = [];
	const file = ts.createSourceFile(
		"feature.tsx",
		source,
		ts.ScriptTarget.Latest,
		true,
		ts.ScriptKind.TSX,
	);
	function visit(node: ts.Node) {
		if (
			(ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
			node.moduleSpecifier &&
			ts.isStringLiteralLike(node.moduleSpecifier)
		) {
			references.push(node.moduleSpecifier.text);
		} else if (
			ts.isCallExpression(node) &&
			(node.expression.kind === ts.SyntaxKind.ImportKeyword ||
				(ts.isIdentifier(node.expression) &&
					node.expression.text === "require")) &&
			node.arguments[0] &&
			ts.isStringLiteralLike(node.arguments[0])
		) {
			references.push(node.arguments[0].text);
		} else if (
			ts.isImportTypeNode(node) &&
			ts.isLiteralTypeNode(node.argument) &&
			ts.isStringLiteralLike(node.argument.literal)
		) {
			references.push(node.argument.literal.text);
		} else if (
			ts.isExternalModuleReference(node) &&
			node.expression &&
			ts.isStringLiteralLike(node.expression)
		) {
			references.push(node.expression.text);
		}
		ts.forEachChild(node, visit);
	}
	visit(file);
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
	if (hasGenericFolder(specifier) || hasGenericFolder(targetPath)) {
		return "use a behavior-named module beside its feature instead of state/ or contexts/.";
	}
	const sourcePath = relative(sourceDirectory, file).split(sep).join("/");
	if (
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
assert.equal(hasGenericFolder("page/editor/state-machine.ts"), false);
assert.deepEqual(
	moduleReferences(`
// import x from "ignored";
const text = 'import x from "ignored"';
import type { Item } from "one";
export { item } from "two";
const load = () => import("three");
type Item = import("four").Item;
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
assert.ok(importViolation(fixtureFile, "./state/item", fixtureRoot));
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

export function checkFeatureBoundaryRules(context: ArchitectureContext) {
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
	checkFolders(context.featureDirectory);
	for (const file of context.allFiles) {
		if (!file.startsWith(`${context.featureDirectory}${sep}`)) continue;
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
