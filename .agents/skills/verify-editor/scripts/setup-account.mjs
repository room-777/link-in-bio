import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import {
	ACCOUNT,
	capture,
	db,
	HANDLE,
	logAction,
	STATE,
	WEB,
} from "./local.mjs";

const evidence = process.argv[2];
if (!evidence)
	throw new Error("Usage: node setup-account.mjs <run-evidence-dir>");
const directory = path.resolve(evidence, "account-setup");
mkdirSync(path.dirname(STATE), { recursive: true, mode: 0o700 });
const browser = await chromium.launch({
	headless: false,
	executablePath:
		process.env.CHROME_PATH ??
		"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
});
const context = await browser.newContext({
	viewport: { width: 1365, height: 900 },
});
await context.route("https://**/*", (route) => route.abort());
const page = await context.newPage();
const requests = [];
const diagnostics = [];
page.on("console", (message) => {
	if (message.type() === "error") {
		diagnostics.push(`console error: ${message.text()}`);
		logAction(directory, `console error: ${message.text()}`);
	}
});
page.on("pageerror", (error) => {
	diagnostics.push(`page error: ${error.message}`);
	logAction(directory, `page error: ${error.message}`);
});
page.on("response", (response) => {
	if (new URL(response.url()).origin === "http://127.0.0.1:3001") {
		const route = new URL(response.url()).pathname;
		requests.push(
			`${response.request().method()} ${route} ${response.status()}`,
		);
		logAction(
			directory,
			`HTTP ${response.request().method()} ${route} ${response.status()}`,
		);
		if (route.startsWith("/pages"))
			void response
				.text()
				.then((body) => {
					const line = `API ${route} ${response.status()}: ${body.slice(0, 600)}`;
					diagnostics.push(line);
					logAction(directory, line);
				})
				.catch(() => {});
	}
});

const accountExists =
	db(`select count(*) from "user" where email='${ACCOUNT}'`) === "1";
const pageExists =
	db(
		`select count(*) from pages p join "user" u on u.id=p.user_id where u.email='${ACCOUNT}' and p.handle='${HANDLE}'`,
	) === "1";
await page.goto(`${WEB}/sign-in`);
await capture(page, directory, "sign-in-before");
await page.getByRole("textbox", { name: "Email" }).fill(ACCOUNT);
await page.getByRole("button", { name: "Send OTP" }).click();
await page
	.locator('input[autocomplete="one-time-code"]')
	.waitFor({ state: "visible", timeout: 15_000 });
const code = db(
	`select split_part(value, ':', 1) from verification where identifier='sign-in-otp-${ACCOUNT}' and expires_at > now() order by created_at desc limit 1`,
);
if (!/^\d{6}$/.test(code))
	throw new Error("No fresh six-digit OTP found in the isolated local DB.");
await capture(page, directory, "otp-requested");
logAction(
	directory,
	"Opened /sign-in in a fresh browser context, requested an OTP for the disposable local account, and read the unexpired code only from the isolated verifier database.",
);
await page.locator('input[autocomplete="one-time-code"]').fill(code);
await page.getByRole("button", { name: "Verify code" }).click();
await page.waitForTimeout(1_000);
await capture(page, directory, "otp-verified");

if (!accountExists) {
	if (!page.url().endsWith("/create")) await page.goto(`${WEB}/create`);
	const handleInput = page.getByRole("textbox", { name: "Handle" });
	await handleInput.fill("");
	await handleInput.pressSequentially(HANDLE, { delay: 40 });
	await page.waitForTimeout(1_000);
	await capture(page, directory, "handle-entered");
	logAction(
		directory,
		`Handle DOM/state: ${JSON.stringify(await handleInput.evaluate((input) => ({ value: input.value, tracker: input._valueTracker?.getValue(), reactProps: Object.keys(input).filter((key) => key.startsWith("__reactProps")).length, buttonDisabled: document.querySelector("button[type=submit]")?.disabled })))}`,
	);
	logAction(
		directory,
		`Handle form after entry: ${(await page.locator("body").innerText()).replaceAll("\n", " | ").slice(0, 800)}`,
	);
	if (
		!(await page
			.locator('[aria-label="Handle available"]')
			.isVisible()
			.catch(() => false))
	) {
		await page.getByRole("button", { name: "Grab it" }).click();
		await page.waitForTimeout(500);
		await capture(page, directory, "page-create-failed");
		logAction(
			directory,
			`After attempted Grab it: ${(await page.locator("body").innerText()).replaceAll("\n", " | ").slice(0, 800)}`,
		);
		writeFileSync(
			path.join(directory, "diagnostics.txt"),
			diagnostics.join("\n"),
		);
		throw new Error(
			"Handle availability UI did not update; captured entered and attempted states.",
		);
	}
	await page
		.getByRole("button", { name: "Grab it" })
		.waitFor({ state: "visible" });
	await page.getByRole("button", { name: "Grab it" }).click();
	await page
		.getByRole("heading", { name: "Looking good!" })
		.waitFor({ timeout: 20_000 });
	await capture(page, directory, "page-created-in-ui");
	logAction(
		directory,
		"Created the featuremap-test page through the product /create form; no direct page insert was used.",
	);
	await page.getByRole("button", { name: "Go to profile" }).click();
} else if (!pageExists) {
	await page.goto(`${WEB}/create`);
	const handleInput = page.getByRole("textbox", { name: "Handle" });
	await handleInput.fill("");
	await handleInput.pressSequentially(HANDLE, { delay: 40 });
	await page.waitForTimeout(1_000);
	await capture(page, directory, "handle-entered");
	logAction(
		directory,
		`Handle DOM/state: ${JSON.stringify(await handleInput.evaluate((input) => ({ value: input.value, tracker: input._valueTracker?.getValue(), reactProps: Object.keys(input).filter((key) => key.startsWith("__reactProps")).length, buttonDisabled: document.querySelector("button[type=submit]")?.disabled })))}`,
	);
	logAction(
		directory,
		`Handle form after entry: ${(await page.locator("body").innerText()).replaceAll("\n", " | ").slice(0, 800)}`,
	);
	if (
		!(await page
			.locator('[aria-label="Handle available"]')
			.isVisible()
			.catch(() => false))
	) {
		await page.getByRole("button", { name: "Grab it" }).click();
		await page.waitForTimeout(500);
		await capture(page, directory, "page-create-failed");
		logAction(
			directory,
			`After attempted Grab it: ${(await page.locator("body").innerText()).replaceAll("\n", " | ").slice(0, 800)}`,
		);
		writeFileSync(
			path.join(directory, "diagnostics.txt"),
			diagnostics.join("\n"),
		);
		throw new Error(
			"Handle availability UI did not update; captured entered and attempted states.",
		);
	}
	await page.getByRole("button", { name: "Grab it" }).click();
	await capture(page, directory, "page-create-submitted");
	await page.getByRole("button", { name: "Go to profile" }).click();
} else {
	await page.goto(`${WEB}/${HANDLE}`);
}

await page.waitForTimeout(1_000);
await capture(page, directory, "owner-page");
const userId = db(`select id from "user" where email='${ACCOUNT}'`);
if (!userId)
	throw new Error("Product UI signup did not create the local account row.");
const pageId = db(
	`select id from pages where handle='${HANDLE}' and user_id='${userId}'`,
);
if (!pageId)
	throw new Error("The product UI did not create the expected owner page row.");

db(
	`insert into creem_subscription (id, product_id, reference_id, creem_subscription_id, status, period_start, period_end, cancel_at_period_end) values ('feature-map-local-pro', 'local-pro', '${userId}', 'feature-map-local-pro', 'active', now(), now() + interval '1 year', false) on conflict (id) do update set product_id='local-pro', reference_id='${userId}', status='active', period_start=now(), period_end=now()+interval '1 year', cancel_at_period_end=false`,
);
await context.storageState({ path: STATE });
writeFileSync(
	path.join(directory, "setup-result.md"),
	[
		`Account existed before setup: ${accountExists}`,
		`Page existed before setup: ${pageExists}`,
		`Account/page created through UI: ${!accountExists || !pageExists}`,
		"Local Pro grant: subscription row with local-only product id; DB readback passed.",
		`Saved browser state: ${STATE}`,
		`HTTP: ${requests.join("; ")}`,
		`User id: ${userId}`,
		`Page id: ${pageId}`,
		`Console/API details: ${diagnostics.join("; ")}`,
	].join("\n"),
);
await browser.close();
console.log(
	`setup complete; account=${ACCOUNT}; handle=${HANDLE}; state=${STATE}`,
);
