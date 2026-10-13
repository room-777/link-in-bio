import assert from "node:assert/strict";
import { basename, relative } from "node:path";
import type { ArchitectureContext } from "./context";

function isKebabCaseFileName(name: string) {
	return /^[a-z0-9]+(?:-[a-z0-9]+)*(?:\.[a-z0-9]+(?:-[a-z0-9]+)*)+$/.test(name);
}

assert.equal(isKebabCaseFileName("page-header.tsx"), true);
assert.equal(isKebabCaseFileName("vite-env.d.ts"), true);
assert.equal(isKebabCaseFileName("PageHeader.tsx"), false);
assert.equal(isKebabCaseFileName("page_header.tsx"), false);

export function checkFileNameRules(context: ArchitectureContext) {
	return context.fileNameFiles
		.filter((path) => basename(path) !== ".gitkeep")
		.filter((path) => !isKebabCaseFileName(basename(path)))
		.map(
			(path) =>
				`${relative(context.repositoryRoot, path)}: filename must use kebab-case.`,
		);
}
