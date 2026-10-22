/**
 * The one list of repository checks. CI and deploy both run `bun run verify`.
 * Add checks here, not only in one workflow.
 */
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirFromModuleUrl } from "./lib/paths";

const root = dirFromModuleUrl(import.meta.url, "..");

function fail(message: string): never {
	console.error(`\n✖ verify: ${message}`);
	process.exit(1);
}

function checkToolVersions() {
	const wantNode = readFileSync(`${root}.node-version`, "utf8").trim();
	const node = spawnSync("node", ["--version"], { encoding: "utf8" });
	const haveNode = node.stdout?.trim().replace(/^v/, "") ?? "";
	if (node.status !== 0 || haveNode.split(".")[0] !== wantNode.split(".")[0])
		fail(
			`Node ${wantNode}.x is required (found ${haveNode || "none"}). ` +
				"Install it with nvm/fnm/volta; .node-version pins it.",
		);

	const packageManager: string = JSON.parse(
		readFileSync(`${root}package.json`, "utf8"),
	).packageManager;
	const wantBun = packageManager.replace(/^bun@/, "");
	const [wantMajor, wantMinor] = wantBun.split(".");
	const [haveMajor, haveMinor] = Bun.version.split(".");
	if (haveMajor !== wantMajor || haveMinor !== wantMinor)
		fail(
			`Bun ${wantMajor}.${wantMinor}.x is required (found ${Bun.version}); package.json pins bun@${wantBun}.`,
		);
	if (Bun.version !== wantBun)
		console.warn(
			`! verify: Bun ${Bun.version} differs from bun@${wantBun} used in CI (patch only).`,
		);
}

const steps: Array<[name: string, command: string[]]> = [
	[
		"Verification evidence paths",
		["bun", "scripts/check-verification-artifacts.mjs"],
	],
	["Biome (format + lint, whole repo)", ["bunx", "biome", "ci", "."]],
	["Typecheck (every package)", ["bun", "run", "check-types"]],
	[
		"Web callback names",
		["bun", "apps/web/scripts/check-architecture.ts", "callbacks"],
	],
	["Production keys", ["bun", "run", "check:prod-keys"]],
	["Feature-map drivers", ["bun", "run", "check:feature-drivers"]],
	["Feature-map journey types", ["bun", "run", "check:featuremap-types"]],
	[
		"Tests (every package, excluding isolated billing service)",
		[
			"bun",
			"test",
			"--path-ignore-patterns=**/dist/**",
			"--path-ignore-patterns=**/node_modules/**",
			"--path-ignore-patterns=**/billing.service.test.ts",
		],
	],
	[
		"Billing service tests (isolated)",
		["bun", "test", "apps/server/tests/services/billing.service.test.ts"],
	],
	["Plan boundary", ["bun", "run", "check:plan-boundary"]],
];

checkToolVersions();
for (const [name, [command, ...args]] of steps) {
	console.log(`\n▶ ${name}: ${[command, ...args].join(" ")}`);
	const started = Date.now();
	const result = spawnSync(command as string, args, {
		cwd: root,
		stdio: "inherit",
		env: { ...process.env, FORCE_COLOR: process.env.FORCE_COLOR ?? "1" },
	});
	if (result.status !== 0) fail(`${name} failed.`);
	console.log(`✓ ${name} (${((Date.now() - started) / 1000).toFixed(1)}s)`);
}
console.log("\n✓ verify: all checks passed");
