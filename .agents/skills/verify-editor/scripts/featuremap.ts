// `bun run featuremap [-- <playwright args>]`: claims a run id and free ports,
// starts the isolated local stack, runs every mapped journey, writes
// featuremap-results/, stops the stack, and exits nonzero when anything failed.
import { type ChildProcess, spawn, spawnSync } from "node:child_process";
import { createWriteStream, mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
	claimCheckout,
	claimStack,
	LOGS_DIR,
	RESULTS_DIR,
	ROOT,
	type Stack,
	stackEnv,
} from "../harness/stack.ts";

const SKILL = fileURLToPath(new URL("../", import.meta.url));
const script = (name: string) => path.join(SKILL, "scripts", name);

function startStack(): Promise<ChildProcess> {
	const stack = spawn(script("start-local.sh"), [LOGS_DIR], {
		cwd: ROOT,
		stdio: ["ignore", "pipe", "pipe"],
	});
	const log = createWriteStream(path.join(LOGS_DIR, "start-local.log"));
	stack.stdout.pipe(log);
	stack.stderr.pipe(log);
	return new Promise((resolve, reject) => {
		stack.stdout.on("data", (chunk: Buffer) => {
			if (chunk.toString().includes("ready web=")) resolve(stack);
		});
		stack.on("exit", (code) =>
			reject(
				new Error(
					`start-local.sh exited ${code} before the stack was ready; see logs/start-local.log`,
				),
			),
		);
	});
}

function writeStackFailure(error: Error) {
	writeFileSync(
		path.join(RESULTS_DIR, "summary.json"),
		`${JSON.stringify(
			{
				status: "failed",
				total: 0,
				passed: 0,
				failed: 0,
				skipped: 0,
				durationMs: 0,
				commit: spawnSync("git", ["rev-parse", "HEAD"], {
					cwd: ROOT,
					encoding: "utf8",
				}).stdout.trim(),
				failures: [
					{
						feature: "stack",
						test: "start-local",
						error: error.message,
						file: ".agents/skills/verify-editor/scripts/start-local.sh:1",
					},
				],
			},
			null,
			2,
		)}\n`,
	);
	writeFileSync(
		path.join(RESULTS_DIR, "results.md"),
		`# Feature map results\n\nStatus: **failed**. The local stack did not start: ${error.message}\n`,
	);
}

const releaseCheckout = claimCheckout();
rmSync(RESULTS_DIR, { recursive: true, force: true });
mkdirSync(LOGS_DIR, { recursive: true });
let claim: { stack: Stack; release: () => void } | undefined;
let server: ChildProcess | undefined;
let code = 1;
const stop = () => {
	if (claim)
		spawnSync(script("stop-local.sh"), [LOGS_DIR], {
			cwd: ROOT,
			stdio: "inherit",
		});
	server?.kill();
	claim?.release();
	releaseCheckout();
};
for (const signal of ["SIGINT", "SIGTERM"] as const)
	process.once(signal, () => {
		stop();
		process.exit(130);
	});
try {
	claim = await claimStack(process.env);
	Object.assign(process.env, stackEnv(claim.stack));
	writeFileSync(
		path.join(LOGS_DIR, "stack.json"),
		`${JSON.stringify(claim.stack, null, 2)}\n`,
	);
	server = await startStack();
	const doctor = spawnSync(script("doctor.sh"), [LOGS_DIR], {
		cwd: ROOT,
		encoding: "utf8",
	});
	if (doctor.status !== 0)
		throw new Error(`doctor.sh failed: ${doctor.stderr || doctor.stdout}`);
	// Compile the routes every journey opens before the budget clock starts.
	const { HANDLE, WEB } = await import("../harness/local.ts");
	for (const route of ["/sign-in", `/${HANDLE}`])
		await fetch(`${WEB}${route}`).then((response) => response.text());
	const run = spawnSync(
		path.join(ROOT, "node_modules/.bin/playwright"),
		[
			"test",
			"--config",
			path.join(SKILL, "playwright.config.ts"),
			...process.argv.slice(2),
		],
		{
			cwd: ROOT,
			stdio: "inherit",
			env: { ...process.env, FEATUREMAP_STACK_DIR: LOGS_DIR },
		},
	);
	code = run.status ?? 1;
} catch (error) {
	console.error((error as Error).message);
	writeStackFailure(error as Error);
} finally {
	stop();
}
process.exit(code);
