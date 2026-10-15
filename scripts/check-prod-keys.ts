/**
 * Fails when production keys or resources can reach local, bot or test code.
 * Rule (CONTRIBUTING.md, "Production keys"): only the Deploy workflow holds
 * production keys. Runs in `bun run verify` and CI.
 * Reads tracked files from the index and never prints values beyond a match.
 */
import { spawnSync } from "node:child_process";

/** Files allowed to name production env files and secrets: the deploy path. */
const DEPLOY_FILES = new Set([
	".github/workflows/deploy.yml",
	"packages/infra/alchemy.run.ts",
	"packages/infra/package.json",
	// Production build and the explicit production migration (README).
	"apps/server/tsdown.config.ts",
	"packages/db/drizzle.config.ts",
	"scripts/check-prod-keys.ts",
	// The guard's own test uses production-looking hosts as rejected inputs.
	"scripts/prod-guard.test.ts",
]);
const DOC_FILE = /\.(md|mdx)$/;

/** Local, bot and test code: tests, scripts, examples, local configs, CI. */
const LOCAL_OR_TEST =
	/(^|\/)(tests?|__tests__|e2e|scripts|supabase)\/|\.test\.tsx?$|\.env\.example$|^\.github\/workflows\/ci\.yml$|^\.githooks\//;

const PRODUCTION_HOST =
	/\b[a-z0-9-]+\.r2\.cloudflarestorage\.com\b|\b[a-z0-9.-]*supabase\.(co|com)\b/i;
/** The production R2 bucket is named "grabbin"; local tests use another name. */
const PRODUCTION_BUCKET =
	/bucket(Name)?["']?\s*[:=]\s*["']grabbin["']|r2\s+(object|bucket)\s+\S+\s+["']?grabbin(\/|["'\s]|$)|--bucket[= ]["']?grabbin\b/i;
const REMOTE_R2 = /wrangler\s+r2\b[^\n]*--remote\b/;
const PRODUCTION_ENV_FILE = /\.env\.production\b/;
const PRODUCTION_SECRET =
	/secrets\.(WEB_ENV_PRODUCTION|SERVER_ENV_PRODUCTION|CLOUDFLARE_API_TOKEN|CLOUDFLARE_ACCOUNT_ID)\b/;

const files = spawnSync("git", ["ls-files", "-z"], { encoding: "utf8" })
	.stdout.split("\0")
	.filter(Boolean);

const violations: string[] = [];
const report = (file: string, line: number, reason: string) =>
	violations.push(`${file}:${line}: ${reason}`);

for (const file of files) {
	const name = file.split("/").pop() ?? "";
	if (/^\.env(\..+)?$/.test(name) && name !== ".env.example") {
		report(file, 1, "env files must not be committed (only .env.example)");
		continue;
	}
	if (DEPLOY_FILES.has(file) || /node_modules\//.test(file)) continue;
	if (!/\.(ts|tsx|js|mjs|cjs|json|jsonc|toml|ya?ml|sh|example)$/.test(file))
		continue;

	const staged = spawnSync("git", ["show", `:${file}`], {
		encoding: "utf8",
	});
	if (staged.status !== 0) {
		report(file, 1, "could not read staged file");
		continue;
	}
	const source = staged.stdout;
	const localOrTest = LOCAL_OR_TEST.test(file);
	source.split("\n").forEach((line, index) => {
		const at = index + 1;
		if (!DOC_FILE.test(file) && PRODUCTION_ENV_FILE.test(line))
			report(file, at, "only the deploy path may read .env.production");
		if (PRODUCTION_SECRET.test(line))
			report(file, at, "production secrets belong to deploy.yml only");
		if (!localOrTest) return;
		if (PRODUCTION_HOST.test(line))
			report(file, at, "production host in local or test code");
		if (PRODUCTION_BUCKET.test(line))
			report(file, at, 'production R2 bucket "grabbin" in local or test code');
		if (REMOTE_R2.test(line))
			report(file, at, "remote R2 commands are for the deploy path only");
	});
}

if (violations.length) {
	console.error(
		"Production keys or resources referenced outside the deploy path:\n" +
			violations.join("\n") +
			'\nSee CONTRIBUTING.md, "Production keys".',
	);
	process.exit(1);
}
console.log("Production key check passed.");
