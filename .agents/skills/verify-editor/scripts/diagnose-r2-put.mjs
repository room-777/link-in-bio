import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import { API, capture, db, HANDLE, STATE, WEB } from "./local.mjs";

const runDir = path.resolve(process.argv[2] ?? "");
if (!process.argv[2])
	throw new Error(
		"Usage: node diagnose-r2-put.mjs artifacts/verify-editor/<RUN_ID>",
	);
const out = path.join(runDir, "r2-put-diagnostics");
mkdirSync(out, { recursive: true });
const image = path.join(out, "upload-fixture.webp");
const { copyFileSync } = await import("node:fs");
copyFileSync(
	"apps/web/public/images/landing/hero-profile-preview-6c812da2.webp",
	image,
);
const pageId = db(`select id from pages where handle='${HANDLE}'`);
const events = [];
const redact = (value) =>
	value.replace(/https?:\/\/[^\s"']+/g, (raw) => {
		try {
			const u = new URL(raw);
			return `${u.origin}${u.pathname}`;
		} catch {
			return "[url]";
		}
	});
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
await context.route("http://127.0.0.1:3001/media/**", async (route) => {
	const request = route.request();
	const url = new URL(request.url());
	events.push(`route ${request.method()} ${url.origin}${url.pathname}`);
	if (request.method() === "OPTIONS") {
		const requested =
			request.headers()["access-control-request-headers"] ?? "content-type";
		await route.fulfill({
			status: 204,
			headers: {
				"Access-Control-Allow-Origin": WEB,
				"Access-Control-Allow-Credentials": "true",
				"Access-Control-Allow-Methods": "PUT, OPTIONS",
				"Access-Control-Allow-Headers": requested,
			},
		});
		events.push(`preflight fulfilled; requested headers=${requested}`);
		return;
	}
	try {
		const response = await route.fetch({ timeout: 12000 });
		events.push(
			`local worker response ${request.method()} ${url.pathname} ${response.status()}; ACAO=${response.headers()["access-control-allow-origin"] ?? "missing"}`,
		);
		await route.fulfill({
			response,
			headers: {
				...response.headers(),
				"Access-Control-Allow-Origin": WEB,
				"Access-Control-Allow-Credentials": "true",
			},
		});
	} catch (error) {
		events.push(`route.fetch failed: ${redact(String(error).slice(0, 300))}`);
		await route.abort("failed").catch(() => {});
	}
});
const page = await context.newPage();
page.setDefaultTimeout(12000);
page.on("requestfailed", (request) =>
	events.push(
		`requestfailed ${request.method()} ${redact(request.url())}: ${request.failure()?.errorText ?? "unknown"}`,
	),
);
page.on("response", (response) => {
	try {
		const u = new URL(response.url());
		if (u.origin === API)
			events.push(
				`browser response ${response.request().method()} ${u.pathname} ${response.status()}`,
			);
	} catch {}
});
page.on("console", (message) => {
	if (message.type() === "error")
		events.push(`console error: ${redact(message.text()).slice(0, 300)}`);
});
await page.goto(`${WEB}/${HANDLE}`, { waitUntil: "domcontentloaded" });
await page.getByRole("group", { name: "Page editor toolbar" }).waitFor();
await page.waitForFunction(
	() => {
		const button = [...document.querySelectorAll("button")].find(
			(candidate) => candidate.getAttribute("aria-label") === "Advanced",
		);
		return Boolean(button && !button.disabled);
	},
	{ timeout: 20000 },
);
await capture(page, out, "before");
await page.getByRole("button", { name: "Add media", exact: true }).click();
await page
	.locator('input[type="file"][accept="image/*,video/*"]')
	.setInputFiles(image);
await page.waitForTimeout(12000);
await capture(page, out, "after-upload");
const mediaId = db(
	`select id from page_items where page_id='${pageId}' and type='media' order by created_at desc limit 1`,
);
const data = mediaId
	? JSON.parse(
			db(`select data::text from page_items where id='${mediaId}'`) || "{}",
		)
	: {};
const objectKey = data.objectKey ?? "";
const objectStatus = objectKey
	? await context.request
			.get(`${API}/media/${objectKey}`)
			.then((response) => response.status())
			.catch(() => 0)
	: 0;
let cleanup = "no saved item";
if (mediaId) {
	const item = page.locator(`[data-bento-item-id="${mediaId}"]`);
	await item.hover({ force: true }).catch(() => {});
	await item
		.getByRole("button", { name: "Delete item" })
		.click()
		.catch(() => {});
	const end = Date.now() + 10000;
	while (
		Date.now() < end &&
		db(`select count(*) from page_items where id='${mediaId}'`) !== "0"
	)
		await page.waitForTimeout(250);
	cleanup = db(`select count(*) from page_items where id='${mediaId}'`);
}
const summary = {
	events,
	mediaId: mediaId || null,
	objectKeyPresent: Boolean(objectKey),
	objectStatus,
	mediaRowAfterCleanup: cleanup,
	pageItemCountAfterCleanup: db(
		`select count(*) from page_items where page_id='${pageId}'`,
	),
};
writeFileSync(
	path.join(out, "result.json"),
	`${JSON.stringify(summary, null, 2)}\n`,
);
writeFileSync(
	path.join(out, "result.md"),
	`Local R2 browser PUT diagnosis\n\n- Media row id: ${mediaId || "missing"}\n- Object key present: ${Boolean(objectKey)}\n- Local object GET status: ${objectStatus}\n- Row count after visible cleanup: ${cleanup}\n- Page item count after cleanup: ${summary.pageItemCountAfterCleanup}\n\nEvents:\n${events.map((event) => `- ${event}`).join("\n")}\n`,
);
await context.close();
await browser.close();
console.log(JSON.stringify(summary));
