import { afterEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { findUncommittedExtras } from "./worktree";

// Inside a git hook, GIT_DIR / GIT_INDEX_FILE etc. point at the real repo.
// Drop them so these tests only ever touch their temporary repositories.
const env = Object.fromEntries(
	Object.entries(process.env).filter(([key]) => !key.startsWith("GIT_")),
);

const dirs: string[] = [];
afterEach(() => {
	for (const dir of dirs.splice(0))
		rmSync(dir, { recursive: true, force: true });
});

function git(cwd: string, ...args: string[]) {
	const result = spawnSync("git", args, { cwd, env, encoding: "utf8" });
	if (result.status !== 0) throw new Error(result.stderr);
}

function repo() {
	const dir = mkdtempSync(join(tmpdir(), "link in bio 한글 "));
	dirs.push(dir);
	git(dir, "init", "-q");
	git(dir, "config", "user.email", "test@example.com");
	git(dir, "config", "user.name", "test");
	git(dir, "config", "core.hooksPath", "/dev/null");
	writeFileSync(join(dir, "my file.ts"), "export const a = 1;\n");
	writeFileSync(join(dir, "other.ts"), "export const b = 1;\n");
	git(dir, "add", ".");
	git(dir, "commit", "-qm", "init");
	return dir;
}

describe("findUncommittedExtras", () => {
	test("clean tree has nothing extra", () => {
		expect(findUncommittedExtras(repo(), env)).toEqual({
			unstaged: [],
			untracked: [],
		});
	});

	test("keeps filenames with spaces and non-ASCII intact", () => {
		const dir = repo();
		writeFileSync(join(dir, "my file.ts"), "export const a = 2;\n");
		git(dir, "add", "my file.ts");
		writeFileSync(join(dir, "my file.ts"), "export const a = 3;\n");
		writeFileSync(join(dir, "새 파일.ts"), "export {};\n");
		expect(findUncommittedExtras(dir, env)).toEqual({
			unstaged: ["my file.ts"],
			untracked: ["새 파일.ts"],
		});
	});

	test("reports unstaged changes in files that are not staged", () => {
		const dir = repo();
		writeFileSync(join(dir, "my file.ts"), "export const a = 2;\n");
		git(dir, "add", "my file.ts");
		writeFileSync(join(dir, "other.ts"), "export const b = 2;\n");
		expect(findUncommittedExtras(dir, env).unstaged).toEqual(["other.ts"]);
	});
});
