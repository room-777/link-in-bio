import { spawnSync } from "node:child_process";

function gitPaths(
	cwd: string,
	args: string[],
	env: NodeJS.ProcessEnv,
): string[] {
	const result = spawnSync("git", [...args, "-z"], {
		cwd,
		env,
		encoding: "utf8",
	});
	if (result.status !== 0)
		throw new Error(`git ${args.join(" ")} failed: ${result.stderr}`);
	return result.stdout.split("\0").filter(Boolean);
}

/**
 * Changes in the working tree that are not part of the commit. The checks run
 * against the working tree, so any of these could make a commit pass that
 * would fail on its own. NUL-separated git output keeps names with spaces or
 * non-ASCII characters intact.
 */
export function findUncommittedExtras(
	cwd: string,
	env: NodeJS.ProcessEnv = process.env,
) {
	return {
		unstaged: gitPaths(cwd, ["diff", "--name-only"], env),
		untracked: gitPaths(
			cwd,
			["ls-files", "--others", "--exclude-standard"],
			env,
		),
	};
}
