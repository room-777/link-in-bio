import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import type {
	FullConfig,
	FullResult,
	Reporter,
	Suite,
	TestCase,
} from "@playwright/test/reporter";
import { RESULTS_DIR, ROOT } from "./local.ts";

type Status = "passed" | "failed" | "skipped";
type Row = {
	feature: string;
	test: string;
	status: Status;
	durationMs: number;
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
	failures: Array<Pick<Row, "feature" | "test" | "error" | "file">>;
};

export const BUDGET_MS = Number(process.env.FEATUREMAP_BUDGET_S ?? 150) * 1000;
const ANSI = new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, "g");

const featureOf = (test: TestCase) =>
	path.basename(test.location.file).replace(/\.(journey|setup)\.ts$/, "");
const where = (file: string, line: number) =>
	`${path.relative(ROOT, file)}:${line}`;

function statusOf(test: TestCase): Status {
	const outcome = test.outcome();
	if (outcome === "skipped") return "skipped";
	return outcome === "unexpected" ? "failed" : "passed";
}

function markdown(summary: Summary, rows: Row[]) {
	const cell = (value: string) => value.replaceAll("|", "/");
	const features = [...new Set(rows.map((row) => row.feature))];
	return [
		"# Feature map results",
		"",
		`Status: **${summary.status}**. ${summary.passed}/${summary.total} passed, ${summary.failed} failed, ${summary.skipped} skipped.`,
		`Wall time: ${(summary.durationMs / 1000).toFixed(1)} s (budget ${BUDGET_MS / 1000} s). Commit: ${summary.commit}.`,
		"",
		...summary.failures.flatMap((failure) => [
			`- FAIL ${failure.feature} / ${failure.test}: ${failure.error} (${failure.file})`,
		]),
		"",
		"| Journey | Sub-feature | Result | Seconds | Error |",
		"| --- | --- | --- | --- | --- |",
		...features.flatMap((feature) =>
			rows
				.filter((row) => row.feature === feature)
				.map(
					(row) =>
						`| ${feature} | ${cell(row.test)} | ${row.status} | ${(row.durationMs / 1000).toFixed(1)} | ${cell(row.error)} |`,
				),
		),
		"",
	].join("\n");
}

/**
 * Writes the results contract CI reads: featuremap-results/summary.json and
 * results.md. A run over the wall-clock budget fails even when every test
 * passed, so slow waits cannot creep back in.
 */
export default class ResultsReporter implements Reporter {
	private suite: Suite | undefined;

	onBegin(_config: FullConfig, suite: Suite) {
		this.suite = suite;
	}

	private row(test: TestCase): Row {
		const result = test.results.at(-1);
		const error = (result?.error?.message ?? "").replace(ANSI, "");
		const location = result?.error?.location ?? test.location;
		return {
			feature: featureOf(test),
			test: test.title,
			status: result ? statusOf(test) : "skipped",
			durationMs: result?.duration ?? 0,
			error: error.split("\n").find(Boolean) ?? "",
			file: where(location.file, location.line),
		};
	}

	async onEnd(result: FullResult) {
		const tests = this.suite?.allTests() ?? [];
		const isSetup = (test: TestCase) =>
			test.location.file.endsWith(".setup.ts");
		const rows = tests
			.filter((test) => !isSetup(test))
			.map((test) => this.row(test));
		const failed = [
			...tests
				.filter(isSetup)
				.map((test) => this.row(test))
				.filter((row) => row.status === "failed"),
			...rows.filter((row) => row.status === "failed"),
		];
		if (result.duration > BUDGET_MS)
			failed.push({
				feature: "run",
				test: "wall-clock budget",
				status: "failed",
				durationMs: result.duration,
				error: `run took ${(result.duration / 1000).toFixed(1)} s, over the ${BUDGET_MS / 1000} s budget`,
				file: ".agents/skills/verify-editor/playwright.config.ts:1",
			});
		if (result.status !== "passed" && !failed.length)
			failed.push({
				feature: "run",
				test: "playwright",
				status: "failed",
				durationMs: result.duration,
				error: `Playwright run ended with status ${result.status}`,
				file: ".agents/skills/verify-editor/playwright.config.ts:1",
			});
		const count = (status: Status) =>
			rows.filter((row) => row.status === status).length;
		const summary: Summary = {
			status: failed.length ? "failed" : "passed",
			total: rows.length,
			passed: count("passed"),
			failed: count("failed"),
			skipped: count("skipped"),
			durationMs: Math.round(result.duration),
			commit: execFileSync("git", ["rev-parse", "HEAD"], {
				cwd: ROOT,
				encoding: "utf8",
			}).trim(),
			failures: failed.map(({ feature, test, error, file }) => ({
				feature,
				test,
				error,
				file,
			})),
		};
		mkdirSync(RESULTS_DIR, { recursive: true });
		writeFileSync(
			path.join(RESULTS_DIR, "summary.json"),
			`${JSON.stringify(summary, null, 2)}\n`,
		);
		writeFileSync(
			path.join(RESULTS_DIR, "results.md"),
			markdown(summary, rows),
		);
		console.log(
			`featuremap: ${summary.passed}/${summary.total} passed, ${summary.failed} failed, ${summary.skipped} skipped in ${(summary.durationMs / 1000).toFixed(1)} s (budget ${BUDGET_MS / 1000} s)`,
		);
		return { status: failed.length ? ("failed" as const) : result.status };
	}
}
