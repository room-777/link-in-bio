/**
 * Feature-map drivers are regenerated often. This check keeps every
 * regenerated driver on the shared harness: app labels must exist in
 * the app source, each feature runs in its own browser context, and no raw
 * selectors, fixed sleeps or forced actions slip back in.
 */
import { readdirSync, readFileSync, rmSync } from "node:fs";
import { checkDriverSource } from "../.agents/skills/verify-editor/harness/driver-rules";
import {
	appSources,
	buildUiContract,
} from "../.agents/skills/verify-editor/harness/ui-contract";
import { dirFromModuleUrl } from "./lib/paths";
import { stagedSnapshot } from "./lib/staged-snapshot";

// `--staged` (the pre-commit hook) checks the index snapshot, so labels from
// untracked app files or unstaged edits cannot vouch for a committed driver.
const repoRoot = dirFromModuleUrl(import.meta.url, "..");
const root = process.argv.includes("--staged")
	? stagedSnapshot(repoRoot)
	: repoRoot;
if (root !== repoRoot)
	process.on("exit", () => rmSync(root, { recursive: true, force: true }));
const scripts = ".agents/skills/verify-editor/scripts";
const HARNESS_SUPPORT = new Set(["local.mjs", "mock-outbound.mjs"]);

const contract = buildUiContract(appSources(root));
const failures = readdirSync(`${root}${scripts}`)
	.filter((file) => file.endsWith(".mjs") && !HARNESS_SUPPORT.has(file))
	.flatMap((file) =>
		checkDriverSource(
			readFileSync(`${root}${scripts}/${file}`, "utf8"),
			contract,
		).map(
			(violation) =>
				`${scripts}/${file}:${violation.line} ${violation.message}`,
		),
	);

if (failures.length) {
	console.error(`✖ feature drivers:\n${failures.join("\n")}`);
	process.exit(1);
}
console.log("✓ feature drivers use the harness and labels the app renders");
