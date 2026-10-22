/**
 * Feature-map journeys are regenerated often. This check keeps every
 * regenerated journey on the shared fixtures: one spec per feature map with
 * its sub-features as tests, app labels that exist in the app source, and no
 * raw selectors, fixed sleeps or forced actions.
 */
import { rmSync } from "node:fs";
import {
	appSources,
	buildUiContract,
} from "../.agents/skills/verify-editor/harness/ui-contract";
import { checkFeatureDrivers } from "./lib/feature-drivers";
import { dirFromModuleUrl } from "./lib/paths";
import { stagedSnapshot } from "./lib/staged-snapshot";

// `--staged` (the pre-commit hook) checks the index snapshot, so labels from
// untracked app files or unstaged edits cannot vouch for a committed journey.
const repoRoot = dirFromModuleUrl(import.meta.url, "..");
const root = process.argv.includes("--staged")
	? stagedSnapshot(repoRoot)
	: repoRoot;
if (root !== repoRoot)
	process.on("exit", () => rmSync(root, { recursive: true, force: true }));

const failures = checkFeatureDrivers(root, buildUiContract(appSources(root)));
if (failures.length) {
	console.error(`✖ feature drivers:\n${failures.join("\n")}`);
	process.exit(1);
}
console.log("✓ feature journeys use the fixtures and labels the app renders");
