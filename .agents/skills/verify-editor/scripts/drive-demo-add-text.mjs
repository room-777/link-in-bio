// Prove `add-item` on /demo: "Add text" adds a text block, "Delete item" removes it.
// Usage (from a directory where `playwright` is installed):
//   node <skill>/scripts/drive-demo-add-text.mjs <EVIDENCE_DIR>
import { mkdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";

const { chromium } = createRequire(`${process.cwd()}/`)("playwright");
const evidence = process.argv[2];
if (!evidence) throw new Error("usage: drive-demo-add-text.mjs <EVIDENCE_DIR>");
mkdirSync(evidence, { recursive: true });
const log = [];
const step = (line) => {
	log.push(line);
	console.log(line);
};

const browser = await chromium.launch();
const page = await (
	await browser.newContext({ viewport: { width: 1280, height: 900 } })
).newPage();
try {
	await page.goto("http://127.0.0.1:3000/demo", {
		waitUntil: "networkidle",
		timeout: 240_000,
	});
	const textBlocks = page.getByRole("textbox", { name: "Text content" });
	const before = await textBlocks.count();
	writeFileSync(
		`${evidence}/before.aria.txt`,
		await page.locator("body").ariaSnapshot(),
	);
	await page.screenshot({ path: `${evidence}/before.png`, fullPage: true });
	step(`before: ${before} "Text content" blocks`);

	await page
		.getByRole("group", { name: "Page editor toolbar" })
		.getByRole("button", { name: "Add text" })
		.click();
	await page.waitForFunction(
		(n) => document.querySelectorAll('[aria-label="Text content"]').length > n,
		before,
		{ timeout: 10_000 },
	);
	const added = textBlocks.nth(before);
	await added.fill("Verification note");
	const after = await textBlocks.count();
	writeFileSync(
		`${evidence}/after-add.aria.txt`,
		await page.locator("body").ariaSnapshot(),
	);
	await page.screenshot({ path: `${evidence}/after-add.png`, fullPage: true });
	step(
		`after Add text: ${after} blocks; new block value="${await added.inputValue()}"`,
	);
	if (after !== before + 1)
		throw new Error(`expected ${before + 1} text blocks, saw ${after}`);

	const shell = page
		.locator("[data-bento-item-id], [data-item-id]")
		.filter({ has: added });
	const deleteButton =
		(await shell.count()) > 0
			? shell.getByRole("button", { name: "Delete item" })
			: added
					.locator("xpath=ancestor::*[.//button[@aria-label='Delete item']][1]")
					.getByRole("button", { name: "Delete item" });
	await added.hover();
	await deleteButton.first().click();
	await page.waitForFunction(
		(n) =>
			document.querySelectorAll('[aria-label="Text content"]').length === n,
		before,
		{ timeout: 10_000 },
	);
	await page.screenshot({
		path: `${evidence}/after-delete.png`,
		fullPage: true,
	});
	step(`after Delete item: ${await textBlocks.count()} blocks (restored)`);
	step("RESULT: PASS");
} catch (error) {
	step(
		`RESULT: FAIL ${error instanceof Error ? error.message : String(error)}`,
	);
	await page
		.screenshot({ path: `${evidence}/failure.png`, fullPage: true })
		.catch(() => {});
	process.exitCode = 1;
} finally {
	writeFileSync(
		`${evidence}/actions.md`,
		`${log.map((l) => `- ${l}`).join("\n")}\n`,
	);
	await browser.close();
}
