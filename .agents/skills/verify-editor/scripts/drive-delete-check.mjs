import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import { API, db, HANDLE, STATE, WEB } from "./local.mjs";

const runDir = path.resolve(process.argv[2] ?? "");
if (!process.argv[2])
	throw new Error(
		"Usage: node drive-delete-check.mjs artifacts/verify-editor/<RUN_ID>",
	);
const outputDir = path.join(runDir, "editor-add-item", "delete-focused");
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
const page = await context.newPage();
page.setDefaultTimeout(12000);
const pageId = db(`select id from pages where handle='${HANDLE}'`);
const responses = [];
page.on("response", (response) => {
	if (new URL(response.url()).origin === API)
		responses.push(
			`${response.request().method()} ${new URL(response.url()).pathname} ${response.status()}`,
		);
});
async function waitForDb(sql, expected) {
	const until = Date.now() + 20000;
	while (Date.now() < until) {
		const value = db(sql);
		if (expected(value)) return value;
		await page.waitForTimeout(250);
	}
	return db(sql);
}
await page.goto(`${WEB}/${HANDLE}`, { waitUntil: "domcontentloaded" });
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
await page.screenshot({
	path: path.join(outputDir, "owner-page.png"),
	fullPage: true,
});
writeFileSync(
	path.join(outputDir, "owner-page.aria.txt"),
	await page.locator("body").ariaSnapshot(),
);
await page.getByRole("button", { name: "Add text" }).click();
await page.waitForTimeout(500);
await page.screenshot({
	path: path.join(outputDir, "add-text.png"),
	fullPage: true,
});
writeFileSync(
	path.join(outputDir, "add-text.aria.txt"),
	await page.locator("body").ariaSnapshot(),
);
const input = page.getByRole("textbox", { name: "Text content" }).last();
await input.fill("Feature map delete check");
await input.press("Tab");
const itemId = await waitForDb(
	`select id from page_items where page_id='${pageId}' and data::text like '%Feature map delete check%' order by created_at desc limit 1`,
	Boolean,
);
if (!itemId) throw new Error("Text row was not created by the UI.");
await page.reload({ waitUntil: "domcontentloaded" });
const card = page.locator(`[data-bento-item-id="${itemId}"]`);
await card.hover();
const deleteButton = card.getByRole("button", { name: "Delete item" });
await deleteButton.waitFor({ state: "visible" });
await page.screenshot({
	path: path.join(outputDir, "before-delete.png"),
	fullPage: true,
});
await deleteButton.click();
const removedFromDom = await card
	.waitFor({ state: "detached", timeout: 5000 })
	.then(() => true)
	.catch(() => false);
const remaining = await waitForDb(
	`select count(*) from page_items where id='${itemId}' and page_id='${pageId}'`,
	(value) => value === "0",
);
await page.screenshot({
	path: path.join(outputDir, "after-delete.png"),
	fullPage: true,
});
const testPassed = remaining === "0";
writeFileSync(
	path.join(outputDir, "result.md"),
	`Delete item ${itemId}: ${testPassed ? "PASS" : "FAIL"}\nDOM removed after click: ${removedFromDom}\nIsolated DB row count after 20s poll: ${remaining}\nAPI responses: ${responses.join("; ")}\n`,
);
if (!testPassed) {
	const stillVisible = await card.count();
	if (stillVisible) {
		await card.hover();
		await card.getByRole("button", { name: "Delete item" }).click();
		await waitForDb(
			`select count(*) from page_items where id='${itemId}' and page_id='${pageId}'`,
			(value) => value === "0",
		);
	}
}
await context.close();
await browser.close();
console.log(
	`Focused delete result=${testPassed ? "PASS" : "FAIL"}; row=${db(`select count(*) from page_items where id='${itemId}' and page_id='${pageId}'`)}; evidence=${outputDir}`,
);
