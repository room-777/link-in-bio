import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { basename } from "node:path";
import type { ArchitectureContext } from "./context";
import { relativeToDomain } from "./context";

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

assert.deepEqual(
	exportedComponents("export default function PageHeader() {}"),
	["PageHeader"],
);
assert.equal(kebabCase("PageHeader"), "page-header");

export function checkComponentRules(context: ArchitectureContext) {
	const errors: string[] = [];

	for (const path of context.componentFiles) {
		const names = exportedComponents(readFileSync(path, "utf8"));
		if (names.length === 0) continue;
		const relativePath = relativeToDomain(
			context,
			path,
			context.componentDirectory,
		);
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

	return errors;
}
