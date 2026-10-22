import { execFileSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

/**
 * Copies the index (what the next commit contains) of the feature drivers and
 * the app sources into a temp directory and returns it as a repo root. Untracked
 * files and unstaged edits stay out, so the pre-commit check judges exactly the
 * snapshot that will be committed.
 */
export function stagedSnapshot(repoRoot: string): string {
	const out = mkdtempSync(path.join(tmpdir(), "staged-snapshot-"));
	const files = execFileSync(
		"git",
		[
			"ls-files",
			"-z",
			"--",
			".agents/skills/verify-editor",
			"apps/web/src",
			"packages",
		],
		{ cwd: repoRoot },
	);
	execFileSync("git", ["checkout-index", "-z", "--stdin", `--prefix=${out}/`], {
		cwd: repoRoot,
		input: files,
	});
	return `${out}/`;
}
