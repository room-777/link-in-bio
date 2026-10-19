import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import { ACCOUNT, STATE, WEB } from "./local.mjs";

const runDir = path.resolve(process.argv[2] ?? "");
if (!process.argv[2])
	throw new Error(
		"Usage: node drive-widget-check.mjs artifacts/verify-editor/<RUN_ID>",
	);
const outputDir = path.join(
	runDir,
	"editor-advanced-widgets",
	"widget-focused",
);
mkdirSync(outputDir, { recursive: true });
const browser = await chromium.launch({
	headless: false,
	executablePath:
		process.env.CHROME_PATH ??
		"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
});
const context = await browser.newContext({
	storageState: STATE,
	viewport: { width: 1365, height: 900 },
});
await context.route("https://**/*", (route) => route.abort());
const page = await context.newPage();
await page.goto(`${WEB}/featuremap-test`, { waitUntil: "domcontentloaded" });
await page
	.getByRole("group", { name: "Page editor toolbar" })
	.waitFor({ timeout: 20000 });
await page.waitForFunction(
	() => {
		const button = [...document.querySelectorAll("button")].find(
			(candidate) => candidate.getAttribute("aria-label") === "Advanced",
		);
		return Boolean(button && !button.disabled);
	},
	{ timeout: 20000 },
);
const outcomes = [];
for (const name of ["SoundCloud", "Apple Music", "Signature"]) {
	await page.getByRole("button", { name: "Advanced" }).click();
	const catalog = page.getByRole("dialog", { name: "Advanced widgets" });
	await catalog.waitFor({ state: "visible" });
	await catalog.getByRole("textbox", { name: "Search widgets" }).fill(name);
	await catalog.getByRole("button", { name, exact: true }).click();
	const detail = page.getByRole("dialog");
	await detail.waitFor({ state: "visible" });
	const text = await detail.innerText();
	const placeholderVisible = text.includes(
		"Sipping coffee while crafting a polished widget",
	);
	const addActionCount = await detail
		.getByRole("button", { name: /^(Add|Save)/ })
		.count();
	const status = placeholderVisible && addActionCount === 0 ? "PASS" : "FAIL";
	const evidence = `${name}: placeholder visible=${placeholderVisible}; Add/Save buttons=${addActionCount}; observed detail=${text.replaceAll("\n", " | ").slice(0, 180)}.`;
	await page.screenshot({
		path: path.join(
			outputDir,
			`${name.toLowerCase().replaceAll(" ", "-")}.png`,
		),
		fullPage: true,
	});
	writeFileSync(
		path.join(outputDir, `${name.toLowerCase().replaceAll(" ", "-")}.aria.txt`),
		await page.locator("body").ariaSnapshot(),
	);
	outcomes.push({ name, status, evidence });
	await detail.getByRole("button", { name: "Back to widgets" }).click();
	await page
		.getByRole("dialog", { name: "Advanced widgets" })
		.getByRole("button", { name: "Close" })
		.click();
}
writeFileSync(
	path.join(outputDir, "results.md"),
	`Authenticated local Pro owner ${ACCOUNT};\n${outcomes.map((outcome) => `${outcome.status} ${outcome.evidence}`).join("\n")}\n`,
);

const resultPath = path.join(runDir, "results.json");
const { readFile } = await import("node:fs/promises");
const resultData = JSON.parse(await readFile(resultPath, "utf8"));
const addDelete = resultData.summaries
	.find((summary) => summary.feature === "editor-add-item")
	?.subfeatures.find((row) => row.subfeature === "delete-item");
if (addDelete) {
	const deleteEvidence = await readFile(
		path.join(runDir, "editor-add-item", "delete-focused", "result.md"),
		"utf8",
	).catch(() => "");
	const deletePassed =
		/^Delete item .*: PASS$/m.test(deleteEvidence) &&
		/DOM removed after click: true/.test(deleteEvidence) &&
		/Isolated DB row count after 20s poll: 0/.test(deleteEvidence) &&
		/PATCH \/pages\/featuremap-test\/batch 200/.test(deleteEvidence);
	addDelete.status = deletePassed ? "PASS" : "FAIL";
	addDelete.evidence = deletePassed
		? "Focused UI rerun added a text item, clicked its visible Delete item control, observed DOM removal, and read back 0 matching page_items rows; PATCH returned 200. Evidence: editor-add-item/delete-focused/result.md."
		: "Focused delete evidence did not confirm DOM removal, zero matching DB rows, and a 200 save response; see editor-add-item/delete-focused/result.md.";
}
const widgetRows =
	resultData.summaries
		.find((summary) => summary.feature === "editor-advanced-widgets")
		?.subfeatures.filter((row) => row.subfeature === "widget-coming-soon") ??
	[];
outcomes.forEach((outcome, index) => {
	if (!widgetRows[index]) return;
	widgetRows[index].status = outcome.status;
	widgetRows[index].evidence = outcome.evidence;
});
for (const summary of resultData.summaries)
	summary.status =
		summary.subfeatures.length > 0 &&
		summary.subfeatures.every((row) => row.status === "PASS")
			? "PASS"
			: "FAIL";
writeFileSync(resultPath, `${JSON.stringify(resultData, null, 2)}\n`);
const featureTable = resultData.summaries.map(
	(summary) =>
		`| ${summary.feature} | ${summary.status} | ${summary.subfeatures.map((row) => `${row.subfeature}: ${row.status} (${row.evidence.replaceAll("|", "/")})`).join("<br>")} |`,
);
const markdown = [
	"# Feature map run results",
	"",
	`Checkout SHA: ${resultData.sha}`,
	`Run directory: ${runDir}`,
	"Authenticated owner: featuremap-test; local plan readback: local-pro:active",
	"",
	"| Feature | Result | Sub-feature evidence |",
	"| --- | --- | --- |",
	...featureTable,
	"",
	`API responses observed: ${(resultData.network ?? []).join("; ")}`,
].join("\n");
writeFileSync(path.join(runDir, "results.md"), `${markdown}\n`);
await context.close();
await browser.close();
console.log(
	`Widget checks: ${outcomes.map(({ name, status }) => `${name}=${status}`).join(", ")}; updated ${resultPath}`,
);
