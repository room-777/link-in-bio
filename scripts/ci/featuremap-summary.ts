/**
 * Converts the feature-map run's results.json (drive-parallel.mjs) into
 * featuremap-results/summary.json, the contract the CI workflow and its PR
 * comment read. A runner that writes summary.json itself can replace this.
 */
import { readFileSync, writeFileSync } from "node:fs";

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
	summaries: Array<{ feature: string; subfeatures: Row[] }>;
	failures: string[];
};

export type Driver = { path: string; source: string };

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
	}: { commit: string; driver: Driver; runError?: string },
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
				error: "the journey recorded no results; see its group's drive-all.log",
				file: driver.path,
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

if (import.meta.main) {
	const [resultsFile, driverPath, out, runError] = process.argv.slice(2);
	if (!resultsFile || !driverPath || !out)
		throw new Error(
			"Usage: bun featuremap-summary.ts <results.json> <driver.mjs> <summary.json> [run error]",
		);
	const results = readResults(resultsFile);
	const summary = summarize(results, {
		commit: process.env.FEATUREMAP_COMMIT ?? "",
		driver: { path: driverPath, source: readFileSync(driverPath, "utf8") },
		runError: runError || (results ? undefined : `no readable ${resultsFile}`),
	});
	writeFileSync(out, `${JSON.stringify(summary, null, 2)}\n`);
	console.log(
		`featuremap ${summary.status}: ${summary.passed}/${summary.total} passed, ${summary.failures.length} failure rows`,
	);
}
