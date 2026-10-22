import { expect, test } from "bun:test";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import {
	appSources,
	buildUiContract,
} from "../../.agents/skills/verify-editor/harness/ui-contract";
import { stagedSnapshot } from "./staged-snapshot";

const button = (label: string) =>
	`export const B = () => <button type="button">${label}</button>;\n`;

test("the pre-commit contract only sees app labels that are in the commit", () => {
	const repo = mkdtempSync(path.join(tmpdir(), "staged-snapshot-"));
	const git = (...args: string[]) =>
		execFileSync("git", args, { cwd: repo, stdio: "pipe" });
	const write = (file: string, text: string) => {
		mkdirSync(path.dirname(path.join(repo, file)), { recursive: true });
		writeFileSync(path.join(repo, file), text);
	};
	git("init", "-q");
	write("apps/web/src/committed.tsx", button("Committed Name"));
	write("packages/ui/src/staged.tsx", button("Staged Name"));
	git("add", ".");
	// Edited after staging: the commit keeps "Staged Name".
	write("packages/ui/src/staged.tsx", button("Unstaged Edit"));
	// Never staged: not part of the commit at all.
	write("apps/web/src/untracked.tsx", button("Untracked Name"));

	const names = buildUiContract(appSources(stagedSnapshot(repo))).names;
	expect(names).toContain("Committed Name");
	expect(names).toContain("Staged Name");
	expect(names).not.toContain("Unstaged Edit");
	expect(names).not.toContain("Untracked Name");
});
