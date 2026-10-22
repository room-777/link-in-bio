import { describe, expect, test } from "bun:test";
import { locate, parseRunResults, summarize } from "./featuremap-summary.ts";

const driver = {
	path: "drive-all.mjs",
	source: [
		"result(",
		'\t"editor-tweet",',
		'\t"tweet-add",',
		"\tok,",
		");",
		"result(",
		'\t"editor-layout",',
		'\t"tweet-add",',
	].join("\n"),
};
const row = (subfeature: string, status: string, evidence = "ok") => ({
	subfeature,
	status,
	evidence,
});
const results = (summaries: unknown[], failures: string[] = []) =>
	parseRunResults({ seconds: 116.34, summaries, failures });

describe("featuremap summary", () => {
	test("a clean run passes with every sub-feature counted", () => {
		const summary = summarize(
			results([
				{ feature: "editor-tweet", subfeatures: [row("tweet-add", "PASS")] },
				{
					feature: "editor-layout",
					subfeatures: [row("a", "PASS"), row("b", "PASS")],
				},
			]),
			{ commit: "abc", driver },
		);
		expect(summary).toEqual({
			status: "passed",
			total: 3,
			passed: 3,
			failed: 0,
			skipped: 0,
			durationMs: 116340,
			commit: "abc",
			failures: [],
		});
	});

	test("a failed sub-feature names its feature, first error line and driver line", () => {
		const summary = summarize(
			results([
				{
					feature: "editor-layout",
					subfeatures: [
						row(
							"tweet-add",
							"FAIL",
							"\nTimeout 12000ms exceeded.\nCall log: ...",
						),
					],
				},
			]),
			{ commit: "abc", driver },
		);
		expect(summary.status).toBe("failed");
		expect(summary.failed).toBe(1);
		expect(summary.failures).toEqual([
			{
				feature: "editor-layout",
				test: "tweet-add",
				error: "Timeout 12000ms exceeded.",
				file: "drive-all.mjs:8",
			},
		]);
	});

	test("a journey with no results and a budget overrun both fail the run", () => {
		const summary = summarize(
			results(
				[{ feature: "editor-tweet", subfeatures: [] }],
				[
					"group g4 exited 1 without results.json",
					"group g4 exited 1",
					"run took 160.0 s, over the 150 s budget",
				],
			),
			{ commit: "abc", driver },
		);
		expect(summary.failed).toBe(1);
		expect(summary.failures.map((failure) => failure.error)).toEqual([
			"the journey recorded no results; see its group's drive-all.log",
			"group g4 exited 1 without results.json",
			"run took 160.0 s, over the 150 s budget",
		]);
	});

	test("a run that never produced results fails with the setup error", () => {
		const summary = summarize(undefined, {
			commit: "abc",
			driver,
			runError: "setup-account failed: Error: Handle check timed out",
		});
		expect(summary).toMatchObject({ status: "failed", total: 0, failed: 0 });
		expect(summary.failures[0]?.error).toBe(
			"setup-account failed: Error: Handle check timed out",
		);
	});

	test("locate falls back to any mention, then to the file", () => {
		expect(locate(driver, "other", "tweet-add")).toBe("drive-all.mjs:3");
		expect(locate(driver, "other", "missing")).toBe("drive-all.mjs");
	});

	test("results.json from another runner is rejected", () => {
		expect(() => parseRunResults({ status: "passed" })).toThrow();
	});
});
