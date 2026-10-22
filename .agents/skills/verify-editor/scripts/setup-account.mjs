import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
	createJourneys,
	gotoReady,
	launchBrowser,
	settled,
} from "../harness/journey.mjs";
import { body, control, labelled, otpInput } from "../harness/ui.mjs";
import {
	ACCOUNT,
	API,
	capture,
	db,
	HANDLE,
	logAction,
	STATE,
} from "./local.mjs";

const evidence = process.argv[2];
if (!evidence)
	throw new Error("Usage: node setup-account.mjs <run-evidence-dir>");
const directory = path.resolve(evidence, "account-setup");
mkdirSync(path.dirname(STATE), { recursive: true, mode: 0o700 });
const browser = await launchBrowser();
const journeys = createJourneys(browser, {
	prepareContext: (context) =>
		context.route("https://**/*", (route) => route.abort()),
});
const page = await journeys.open("account-setup");
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
	if (new URL(response.url()).origin === API) {
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
await gotoReady(page, "/sign-in");
await capture(page, directory, "sign-in-before");
await control(page, "textbox", "Email").fill(ACCOUNT);
await control(page, "button", "Send OTP").click();
await otpInput(page).waitFor({ state: "visible", timeout: 15_000 });
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
await otpInput(page).fill(code);
await control(page, "button", "Verify code").click();
await settled(page);
await capture(page, directory, "otp-verified");

if (!accountExists) {
	if (!page.url().endsWith("/create")) await gotoReady(page, "/create");
	const handleInput = control(page, "textbox", "Handle");
	await handleInput.fill("");
	await handleInput.pressSequentially(HANDLE, { delay: 40 });
	await settled(page);
	await capture(page, directory, "handle-entered");
	logAction(
		directory,
		`Handle DOM/state: ${JSON.stringify(await handleInput.evaluate((input) => ({ value: input.value, tracker: input._valueTracker?.getValue(), reactProps: Object.keys(input).filter((key) => key.startsWith("__reactProps")).length, buttonDisabled: document.querySelector("button[type=submit]")?.disabled })))}`,
	);
	logAction(
		directory,
		`Handle form after entry: ${(await body(page).innerText()).replaceAll("\n", " | ").slice(0, 800)}`,
	);
	if (
		!(await labelled(page, "Handle available")
			.waitFor({ state: "visible" })
			.then(() => true)
			.catch(() => false))
	) {
		await control(page, "button", "Grab it").click();
		await settled(page);
		await capture(page, directory, "page-create-failed");
		logAction(
			directory,
			`After attempted Grab it: ${(await body(page).innerText()).replaceAll("\n", " | ").slice(0, 800)}`,
		);
		writeFileSync(
			path.join(directory, "diagnostics.txt"),
			diagnostics.join("\n"),
		);
		throw new Error(
			"Handle availability UI did not update; captured entered and attempted states.",
		);
	}
	await control(page, "button", "Grab it").waitFor({ state: "visible" });
	await control(page, "button", "Grab it").click();
	await control(page, "heading", "Looking good!").waitFor({ timeout: 20_000 });
	await capture(page, directory, "page-created-in-ui");
	logAction(
		directory,
		"Created the featuremap-test page through the product /create form; no direct page insert was used.",
	);
	await control(page, "button", "Go to profile").click();
} else if (!pageExists) {
	await gotoReady(page, "/create");
	const handleInput = control(page, "textbox", "Handle");
	await handleInput.fill("");
	await handleInput.pressSequentially(HANDLE, { delay: 40 });
	await settled(page);
	await capture(page, directory, "handle-entered");
	logAction(
		directory,
		`Handle DOM/state: ${JSON.stringify(await handleInput.evaluate((input) => ({ value: input.value, tracker: input._valueTracker?.getValue(), reactProps: Object.keys(input).filter((key) => key.startsWith("__reactProps")).length, buttonDisabled: document.querySelector("button[type=submit]")?.disabled })))}`,
	);
	logAction(
		directory,
		`Handle form after entry: ${(await body(page).innerText()).replaceAll("\n", " | ").slice(0, 800)}`,
	);
	if (
		!(await labelled(page, "Handle available")
			.waitFor({ state: "visible" })
			.then(() => true)
			.catch(() => false))
	) {
		await control(page, "button", "Grab it").click();
		await settled(page);
		await capture(page, directory, "page-create-failed");
		logAction(
			directory,
			`After attempted Grab it: ${(await body(page).innerText()).replaceAll("\n", " | ").slice(0, 800)}`,
		);
		writeFileSync(
			path.join(directory, "diagnostics.txt"),
			diagnostics.join("\n"),
		);
		throw new Error(
			"Handle availability UI did not update; captured entered and attempted states.",
		);
	}
	await control(page, "button", "Grab it").click();
	await capture(page, directory, "page-create-submitted");
	await control(page, "button", "Go to profile").click();
} else {
	await gotoReady(page, `/${HANDLE}`);
}

await settled(page);
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
await page.context().storageState({ path: STATE });
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
await journeys.close();
await browser.close();
console.log(
	`setup complete; account=${ACCOUNT}; handle=${HANDLE}; state=${STATE}`,
);
