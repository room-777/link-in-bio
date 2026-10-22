/**
 * Loads the pages every journey opens once, as owner and as visitor, before
 * the parallel run. On a cold dev server the first request compiles the route
 * and its client modules, which on a 4-core runner takes longer than the
 * drivers' 25 s navigation timeout when six groups ask at the same moment.
 */
import { launchBrowser } from "../../.agents/skills/verify-editor/harness/journey.mjs";
import {
	HANDLE,
	STATE,
	WEB,
} from "../../.agents/skills/verify-editor/scripts/local.mjs";

const COLD_START_MS = 240_000;
const browser = await launchBrowser();
try {
	for (const storageState of [STATE, undefined]) {
		const context = await browser.newContext({ storageState });
		await context.route("https://**/*", (route) => route.abort());
		const page = await context.newPage();
		const started = Date.now();
		await page.goto(`${WEB}/${HANDLE}`, {
			waitUntil: "load",
			timeout: COLD_START_MS,
		});
		await page.waitForFunction(
			() =>
				[...document.querySelectorAll("body *")].some((node) =>
					Object.keys(node).some((key) => key.startsWith("__reactProps")),
				),
			undefined,
			{ timeout: COLD_START_MS },
		);
		console.log(
			`warmed /${HANDLE} as ${storageState ? "owner" : "visitor"} in ${((Date.now() - started) / 1000).toFixed(1)} s`,
		);
		await context.close();
	}
} finally {
	await browser.close();
}
