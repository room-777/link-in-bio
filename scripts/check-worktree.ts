/** Pre-commit guard: the working tree must equal what is being committed. */
import { dirFromModuleUrl } from "./lib/paths";
import { findUncommittedExtras } from "./lib/worktree";

const { unstaged, untracked } = findUncommittedExtras(
	dirFromModuleUrl(import.meta.url, ".."),
);
if (unstaged.length + untracked.length > 0) {
	console.error(
		"pre-commit: the checks read the working tree, so it must match the commit.",
	);
	for (const file of unstaged) console.error(`  unstaged:  ${file}`);
	for (const file of untracked) console.error(`  untracked: ${file}`);
	console.error(
		"Stage them, or set them aside with `git stash push --keep-index --include-untracked`.",
	);
	process.exit(1);
}
