import path from "node:path";
import { defineConfig } from "@playwright/test";
import { RESULTS_DIR, WEB } from "./harness/local.ts";
import { BUDGET_MS } from "./harness/results-reporter.ts";

export default defineConfig({
	testDir: "./journeys",
	// Journeys are independent files; each journey's tests are the ordered
	// steps of one flow on one owner page (journey() makes the file serial).
	fullyParallel: true,
	workers: Number(process.env.FEATUREMAP_WORKERS ?? 6),
	// No retries, and a test that only passes on a retry fails the run:
	// a flake is a failure (scripts/featuremap-no-flake.test.ts).
	retries: 0,
	failOnFlakyTests: true,
	timeout: 60_000,
	expect: { timeout: 10_000 },
	// Hang guard only; the budget itself is checked by the results reporter.
	globalTimeout: BUDGET_MS * 2,
	outputDir: path.join(RESULTS_DIR, "test-output"),
	reporter: [
		["list"],
		[
			"html",
			{
				outputFolder: path.join(RESULTS_DIR, "playwright-report"),
				open: "never",
			},
		],
		["json", { outputFile: path.join(RESULTS_DIR, "playwright-report.json") }],
		["./harness/results-reporter.ts"],
	],
	use: {
		baseURL: WEB,
		headless:
			Boolean(process.env.CI) || process.env.FEATUREMAP_HEADLESS === "1",
		launchOptions: {
			executablePath:
				process.env.CHROME_PATH ||
				(process.platform === "darwin"
					? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
					: undefined),
		},
	},
	projects: [
		{ name: "setup", testMatch: /\.setup\.ts$/ },
		{ name: "journeys", testMatch: /\.journey\.ts$/, dependencies: ["setup"] },
	],
});
