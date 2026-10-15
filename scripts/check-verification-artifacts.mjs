import { spawnSync } from "node:child_process";

const staged = process.argv.includes("--staged");
const existingGuide = "docs/verification/2026-10-15-cloud-agent-feature-map.md";
function gitPaths(args) {
	const result = spawnSync("git", args, { encoding: "utf8" });
	if (result.status !== 0) {
		console.error(result.stderr || "could not read Git paths");
		process.exit(1);
	}
	return result.stdout.split("\0").filter(Boolean);
}

const trackedPaths = gitPaths(["ls-files", "-z"]);
const stagedPaths = staged
	? gitPaths([
			"diff",
			"--cached",
			"--name-only",
			"--no-renames",
			"--diff-filter=ACMR",
			"-z",
		])
	: [];
const forbidden = new Set([
	...trackedPaths.filter(
		(path) =>
			path === "artifacts" ||
			path.startsWith("artifacts/") ||
			(path.startsWith("docs/verification/") && path !== existingGuide),
	),
	...stagedPaths.filter(
		(path) =>
			path === "artifacts" ||
			path.startsWith("artifacts/") ||
			path.startsWith("docs/verification/"),
	),
]);
if (forbidden.size) {
	console.error(
		"Keep verification proof under ignored artifacts/verify-editor/. Do not track artifacts or add files under docs/verification; the existing feature-map setup note is exempt:",
	);
	for (const path of forbidden) console.error(`- ${path}`);
	process.exit(1);
}
console.log(
	staged
		? "✓ staged verification paths are not artifacts"
		: "✓ no verification artifacts are tracked",
);
