import { defineConfig, devices } from "@playwright/test";

const runId = process.env.FEATURE_MAP_RUN_ID ?? `local-${Date.now()}`;

export default defineConfig({
	testDir: "./.agents/skills/verify-editor/tests",
	// Keep tests within a file ordered while they update the shared fixture.
	fullyParallel: false,
	forbidOnly: Boolean(process.env.CI),
	retries: process.env.CI ? 2 : 0,
	// The editor journeys share and update one owner page and local database.
	workers: 1,
	reporter: [
		["list"],
		[
			"html",
			{
				outputFolder: `artifacts/verify-editor/${runId}/html-report`,
				open: "never",
			},
		],
	],
	outputDir: `artifacts/verify-editor/${runId}/playwright`,
	projects: [
		{
			name: "auth-setup",
			testMatch: "**/*.setup.ts",
			use: {
				...devices["Desktop Chrome"],
				baseURL: "http://127.0.0.1:3000",
				storageState: undefined,
				trace: "retain-on-failure",
				screenshot: "on",
				reducedMotion: "reduce",
			},
		},
		{
			name: "chromium",
			testMatch: "**/*.spec.ts",
			dependencies: ["auth-setup"],
			use: {
				...devices["Desktop Chrome"],
				baseURL: "http://127.0.0.1:3000",
				storageState: process.env.PLAYWRIGHT_STORAGE_STATE,
				trace: "retain-on-failure",
				screenshot: "on",
				reducedMotion: "reduce",
			},
		},
	],
});
