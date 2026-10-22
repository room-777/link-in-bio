import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import path from "node:path";

// Production must never deploy a commit whose feature map failed (wooky,
// 2026-10-22). Deploy waits for Release, Release waits for CI, so the
// feature map has to be a CI job; manual deploys run it themselves.
const workflow = (name: string) =>
	Bun.YAML.parse(
		readFileSync(
			path.join(import.meta.dir, "../../.github/workflows", name),
			"utf8",
		),
	) as {
		name: string;
		on: Record<string, unknown>;
		jobs: Record<
			string,
			{ needs?: string[]; if?: string; steps?: { run?: string }[] }
		>;
	};

describe("deploy is gated on the feature map", () => {
	const ci = workflow("ci.yml");
	const release = workflow("release.yml");
	const deploy = workflow("deploy.yml");
	const runsFeaturemap = (job?: { steps?: { run?: string }[] }) =>
		Boolean(job?.steps?.some((step) => step.run === "bun run featuremap"));

	test("CI runs the feature map on pushes to main and on PRs", () => {
		expect(ci.on).toHaveProperty("push");
		expect(ci.on).toHaveProperty("pull_request");
		expect(runsFeaturemap(ci.jobs.featuremap)).toBe(true);
		expect(ci.jobs.featuremap.if).toBeUndefined();
	});

	test("Release waits for CI and Deploy waits for Release", () => {
		expect(
			(release.on.workflow_run as { workflows: string[] }).workflows,
		).toEqual([ci.name]);
		expect(
			(deploy.on.workflow_run as { workflows: string[] }).workflows,
		).toEqual([release.name]);
	});

	test("a manual deploy runs the feature map first", () => {
		expect(runsFeaturemap(deploy.jobs["manual-featuremap"])).toBe(true);
		expect(deploy.jobs.deploy.needs).toContain("manual-featuremap");
		expect(deploy.jobs.deploy.if).toContain(
			"needs.manual-featuremap.result == 'success'",
		);
	});
});
