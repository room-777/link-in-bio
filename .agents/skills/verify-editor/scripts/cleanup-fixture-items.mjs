import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import { API, capture, db, HANDLE, STATE, WEB } from "./local.mjs";

const runDir = path.resolve(process.argv[2] ?? "");
if (!process.argv[2])
	throw new Error(
		"Usage: node cleanup-fixture-items.mjs artifacts/verify-editor/<RUN_ID>",
	);
const out = path.join(runDir, "fixture-cleanup");
mkdirSync(out, { recursive: true });
const pageId = db(`select id from pages where handle='${HANDLE}'`);
const start = db(
	`select id||':'||type from page_items where page_id='${pageId}'`,
)
	.split("\n")
	.filter(Boolean);
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
page.setDefaultTimeout(12000);
const responses = [];
page.on("response", (response) => {
	try {
		if (new URL(response.url()).origin === API)
			responses.push(
				`${response.request().method()} ${new URL(response.url()).pathname} ${response.status()}`,
			);
	} catch {}
});
await page.goto(`${WEB}/${HANDLE}`, { waitUntil: "domcontentloaded" });
await page
	.getByRole("group", { name: "Page editor toolbar" })
	.waitFor({ timeout: 20000 });
await capture(page, out, "before");
const actions = [];
for (const item of start) {
	const [id, type] = item.split(":");
	const card = page.locator(`[data-bento-item-id="${id}"]`);
	await card.scrollIntoViewIfNeeded();
	await card.hover({ force: true });
	await card.getByRole("button", { name: "Delete item" }).click();
	const end = Date.now() + 15000;
	let remaining = "1";
	while (Date.now() < end) {
		remaining = db(`select count(*) from page_items where id='${id}'`);
		if (remaining === "0") break;
		await page.waitForTimeout(250);
	}
	actions.push({ id, type, remaining });
}
await page.reload({ waitUntil: "domcontentloaded" });
await capture(page, out, "after");
const remaining = db(
	`select count(*) from page_items where page_id='${pageId}'`,
);
const plan = db(
	`select product_id||':'||status from creem_subscription where reference_id=(select id from "user" where email='featuremap@example.com') limit 1`,
);
const result = {
	handle: HANDLE,
	start,
	actions,
	remainingPageItems: remaining,
	plan,
	responses,
};
writeFileSync(
	path.join(out, "readback.json"),
	`${JSON.stringify(result, null, 2)}\n`,
);
writeFileSync(
	path.join(out, "readback.md"),
	`Fixture cleanup via owner UI\n\nHandle: ${HANDLE}\nRows before: ${start.length}\nRows removed by UI and DB poll: ${actions.filter((a) => a.remaining === "0").length}\nRemaining page rows: ${remaining}\nPlan readback: ${plan}\nAPI responses: ${responses.join("; ")}\n`,
);
await context.close();
await browser.close();
console.log(JSON.stringify(result));
