import { existsSync, lstatSync, realpathSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(
	dirname(fileURLToPath(import.meta.url)),
	"../../../..",
);
const evidenceRoot = resolve(repoRoot, "artifacts/verify-editor");

function isSymlink(path) {
	try {
		return lstatSync(path).isSymbolicLink();
	} catch (error) {
		if (error.code === "ENOENT") return false;
		throw error;
	}
}

export function requireEvidenceDir(input) {
	if (!input) throw new Error("evidence path is required");
	const target = resolve(input);
	const fromRoot = relative(evidenceRoot, target);
	if (
		!fromRoot ||
		fromRoot === ".." ||
		fromRoot.startsWith(`..${process.platform === "win32" ? "\\" : "/"}`) ||
		isAbsolute(fromRoot)
	)
		throw new Error(`evidence must be under ${evidenceRoot}`);

	for (const path of [join(repoRoot, "artifacts"), evidenceRoot]) {
		if (isSymlink(path))
			throw new Error(`evidence path cannot use a symlink: ${path}`);
	}

	let existing = target;
	while (!existsSync(existing)) existing = dirname(existing);
	const realRoot = existsSync(evidenceRoot)
		? realpathSync(evidenceRoot)
		: repoRoot;
	const realExisting = realpathSync(existing);
	const fromRealRoot = relative(realRoot, realExisting);
	if (
		fromRealRoot === ".." ||
		fromRealRoot.startsWith(`..${process.platform === "win32" ? "\\" : "/"}`) ||
		isAbsolute(fromRealRoot)
	)
		throw new Error(`evidence resolves outside ${evidenceRoot}`);

	return target;
}
