import { describe, expect, test } from "bun:test";
import config from "../.agents/skills/verify-editor/playwright.config";

// A test that fails once and passes on a retry is a flake, and a flake must
// fail the run (wooky, 2026-10-22). Retries would hide it; failOnFlakyTests
// makes the run fail even if someone turns retries back on.
describe("feature-map flake policy", () => {
	test("retries are off", () => {
		expect(config.retries).toBe(0);
	});
	test("a flaky test fails the run", () => {
		expect(config.failOnFlakyTests).toBe(true);
	});
});
