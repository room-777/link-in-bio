import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import {
	checkDriverSource,
	findFixedSleeps,
	subFeatureIds,
} from "../../.agents/skills/verify-editor/harness/driver-rules";
import type { UiContract } from "../../.agents/skills/verify-editor/harness/ui-contract";

const SKILL = ".agents/skills/verify-editor";
const JOURNEY = ".journey.ts";

function tsFiles(root: string, dir: string) {
	const full = path.join(root, SKILL, dir);
	return existsSync(full)
		? readdirSync(full)
				.filter((file) => file.endsWith(".ts"))
				.sort()
				.map((file) => `${SKILL}/${dir}/${file}`)
		: [];
}

/**
 * Every journey spec maps to its feature map and stays on the shared
 * fixtures and labels the app renders; setup files follow the same rules,
 * and no harness or script file sleeps on a clock.
 */
export function checkFeatureDrivers(
	root: string,
	contract: UiContract,
): string[] {
	const read = (file: string) => readFileSync(path.join(root, file), "utf8");
	const specs = tsFiles(root, "journeys");
	const journeys = specs.filter((file) => file.endsWith(JOURNEY));
	if (!journeys.length)
		return [`${SKILL}/journeys: no *${JOURNEY} files to check`];

	const failures: string[] = [];
	for (const file of specs) {
		let journey: { journeyId: string; subFeatures: string[] } | undefined;
		if (file.endsWith(JOURNEY)) {
			const journeyId = path.basename(file, JOURNEY);
			const map = `${SKILL}/features/${journeyId}.md`;
			if (!existsSync(path.join(root, map))) {
				failures.push(
					`${file}:1 features/${journeyId}.md is missing: every journey maps to a feature map`,
				);
				continue;
			}
			journey = { journeyId, subFeatures: subFeatureIds(read(map)) };
		}
		for (const violation of checkDriverSource(read(file), contract, journey))
			failures.push(`${file}:${violation.line} ${violation.message}`);
	}
	for (const file of [...tsFiles(root, "harness"), ...tsFiles(root, "scripts")])
		for (const sleep of findFixedSleeps(read(file)))
			failures.push(`${file}:${sleep.line} ${sleep.message}`);
	return failures;
}
