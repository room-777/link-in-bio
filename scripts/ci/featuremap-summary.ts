/**
 * Converts the feature-map run's results.json (drive-parallel.mjs) into
 * featuremap-results/summary.json, the contract the CI workflow and its PR
 * comment read. A runner that writes summary.json itself can replace this.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

export type Failure = {
	feature: string;
	test: string;
	error: string;
	file: string;
};

export type Summary = {
	status: "passed" | "failed";
	total: number;
	passed: number;
	failed: number;
	skipped: number;
	durationMs: number;
	commit: string;
	failures: Failure[];
};

type Row = { subfeature: string; status: string; evidence: string };
type RunResults = {
	seconds: number;
	groups?: Array<{ index: number; features: string[] }>;
	summaries: Array<{ feature: string; subfeatures: Row[] }>;
	failures: string[];
};

export type Driver = { path: string; source: string };
export type Crash = { error: string; file: string };

/** The thrown error and the driver frame from a crashed group's log. */
export function parseCrash(log: string, driverPath: string): Crash | undefined {
	const lines = log.split("\n");
	const caret = lines.findIndex((line) => line.trim() === "^");
	const message =
		lines.slice(caret + 1).find((line) => line.trim()) ??
		lines.find((line) => /Error\b/.test(line));
	if (!message) return undefined;
	const name = driverPath.split("/").at(-1) ?? driverPath;
	const frame = lines
		.map((line) => line.split(`${name}:`)[1]?.match(/^\d+/)?.[0])
		.find(Boolean);
	return {
		error: firstLine(message),
		file: frame ? `${driverPath}:${frame}` : driverPath,
	};
}

const firstLine = (text: string) =>
	(text.split("\n").find((line) => line.trim()) ?? "").trim().slice(0, 300);

/** Where the driver records this sub-feature: `result("feature", "test", ...)`. */
export function locate(driver: Driver, feature: string, test: string) {
	const lines = driver.source.split("\n");
	const quoted = JSON.stringify(test);
	const near = (index: number) =>
		lines
			.slice(Math.max(0, index - 2), index)
			.some((line) => line.includes(JSON.stringify(feature)));
	const exact = lines.findIndex((line, i) => line.includes(quoted) && near(i));
	const hit =
		exact >= 0 ? exact : lines.findIndex((line) => line.includes(quoted));
	return hit >= 0 ? `${driver.path}:${hit + 1}` : driver.path;
}

export function parseRunResults(json: unknown): RunResults {
	const value = json as Partial<RunResults> | null;
	if (
		!value ||
		typeof value.seconds !== "number" ||
		!Array.isArray(value.summaries) ||
		!Array.isArray(value.failures)
	)
		throw new Error("results.json is not a drive-parallel.mjs result");
	return value as RunResults;
}

export function summarize(
	results: RunResults | undefined,
	{
		commit,
		driver,
		runError,
		crashes = {},
	}: {
		commit: string;
		driver: Driver;
		runError?: string;
		crashes?: Record<string, Crash>;
	},
): Summary {
	const failures: Failure[] = [];
	let total = 0;
	let passed = 0;
	for (const { feature, subfeatures } of results?.summaries ?? []) {
		if (!subfeatures.length) {
			total += 1;
			failures.push({
				feature,
				test: "(no sub-feature results)",
				error:
					crashes[feature]?.error ??
					"the journey recorded no results; see its group's drive-all.log",
				file: crashes[feature]?.file ?? driver.path,
			});
		}
		for (const row of subfeatures) {
			total += 1;
			if (row.status === "PASS") passed += 1;
			else
				failures.push({
					feature,
					test: row.subfeature,
					error: firstLine(row.evidence) || row.status,
					file: locate(driver, feature, row.subfeature),
				});
		}
	}
	const counted = failures.length;
	for (const failure of results?.failures ?? [])
		if (!/^group g\d+ exited \d+$/.test(failure))
			failures.push({
				feature: "(run)",
				test: "run",
				error: failure,
				file: "",
			});
	if (runError)
		failures.push({
			feature: "(run)",
			test: "setup",
			error: firstLine(runError),
			file: "",
		});
	return {
		status: failures.length || total === 0 ? "failed" : "passed",
		total,
		passed,
		failed: counted,
		skipped: 0,
		durationMs: Math.round((results?.seconds ?? 0) * 1000),
		commit,
		failures,
	};
}

function readResults(file: string): RunResults | undefined {
	try {
		return parseRunResults(JSON.parse(readFileSync(file, "utf8")));
	} catch {
		return undefined;
	}
}

function readCrashes(
	runDir: string,
	results: RunResults | undefined,
	driverPath: string,
) {
	const crashes: Record<string, Crash> = {};
	for (const group of results?.groups ?? []) {
		const log = path.join(runDir, "groups", `g${group.index}`, "drive-all.log");
		if (!existsSync(log)) continue;
		const crash = parseCrash(readFileSync(log, "utf8"), driverPath);
		if (crash) for (const feature of group.features) crashes[feature] = crash;
	}
	return crashes;
}

if (import.meta.main) {
	const [runDir, driverPath, out, runError] = process.argv.slice(2);
	if (!runDir || !driverPath || !out)
		throw new Error(
			"Usage: bun featuremap-summary.ts <run-dir> <driver.mjs> <summary.json> [run error]",
		);
	const resultsFile = path.join(runDir, "results.json");
	const results = readResults(resultsFile);
	const summary = summarize(results, {
		commit: process.env.FEATUREMAP_COMMIT ?? "",
		driver: { path: driverPath, source: readFileSync(driverPath, "utf8") },
		runError: runError || (results ? undefined : `no readable ${resultsFile}`),
		crashes: readCrashes(runDir, results, driverPath),
	});
	writeFileSync(out, `${JSON.stringify(summary, null, 2)}\n`);
	console.log(
		`featuremap ${summary.status}: ${summary.passed}/${summary.total} passed, ${summary.failures.length} failure rows`,
	);
}
