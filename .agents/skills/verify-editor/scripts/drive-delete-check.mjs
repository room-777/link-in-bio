import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
	createJourneys,
	gotoReady,
	launchBrowser,
	reloadReady,
	settled,
} from "../harness/journey.mjs";
import { body, control, item } from "../harness/ui.mjs";
import { API, db, dbAsync, HANDLE, STATE } from "./local.mjs";

const runDir = path.resolve(process.argv[2] ?? "");
if (!process.argv[2])
	throw new Error(
		"Usage: node drive-delete-check.mjs artifacts/verify-editor/<RUN_ID>",
	);
const outputDir = path.join(runDir, "editor-add-item", "delete-focused");
mkdirSync(outputDir, { recursive: true });
const browser = await launchBrowser();
const journeys = createJourneys(browser, {});
const page = await journeys.open("editor-add-item", { storageState: STATE });
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
		const value = await dbAsync(sql);
		if (expected(value)) return value;
	}
	return db(sql);
}
await gotoReady(page, `/${HANDLE}`);
await control(page, "group", "Page editor toolbar").waitFor({ timeout: 20000 });
await page.screenshot({
	path: path.join(outputDir, "owner-page.png"),
	fullPage: true,
});
writeFileSync(
	path.join(outputDir, "owner-page.aria.txt"),
	await body(page).ariaSnapshot(),
);
await control(page, "button", "Add text").click();
await settled(page);
await page.screenshot({
	path: path.join(outputDir, "add-text.png"),
	fullPage: true,
});
writeFileSync(
	path.join(outputDir, "add-text.aria.txt"),
	await body(page).ariaSnapshot(),
);
const input = control(page, "textbox", "Text content").last();
await input.fill("Feature map delete check");
await input.press("Tab");
const itemId = await waitForDb(
	`select id from page_items where page_id='${pageId}' and data::text like '%Feature map delete check%' order by created_at desc limit 1`,
	Boolean,
);
if (!itemId) throw new Error("Text row was not created by the UI.");
await reloadReady(page);
const card = item(page, itemId);
const deleteButton = control(card, "button", "Delete item");
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
		await control(card, "button", "Delete item").click();
		await waitForDb(
			`select count(*) from page_items where id='${itemId}' and page_id='${pageId}'`,
			(value) => value === "0",
		);
	}
}
await journeys.close();
await browser.close();
console.log(
	`Focused delete result=${testPassed ? "PASS" : "FAIL"}; row=${db(`select count(*) from page_items where id='${itemId}' and page_id='${pageId}'`)}; evidence=${outputDir}`,
);
