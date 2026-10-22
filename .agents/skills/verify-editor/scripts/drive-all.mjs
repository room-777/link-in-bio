import { execFileSync } from "node:child_process";
import {
	appendFileSync,
	copyFileSync,
	mkdirSync,
	writeFileSync,
} from "node:fs";
import path from "node:path";
import {
	createJourneys,
	gotoReady,
	launchBrowser,
	reloadReady,
	settled,
} from "../harness/journey.mjs";
import {
	blobPreview,
	body,
	content,
	control,
	controlsExcept,
	exactText,
	fileInput,
	item,
	items,
	labelled,
	marker,
	otpInput,
} from "../harness/ui.mjs";
import {
	ACCOUNT,
	API,
	capture,
	db,
	dbAsync,
	HANDLE,
	STATE,
	WEB,
} from "./local.mjs";

const runDir = path.resolve(process.argv[2] ?? "");
if (!process.argv[2])
	throw new Error("Usage: node drive-all.mjs artifacts/verify-editor/<RUN_ID>");
const results = [];
const redacted = (value) =>
	String(value).replaceAll(ACCOUNT, "[local test account]");
const fixtureDir = path.join(runDir, "fixtures");
mkdirSync(fixtureDir, { recursive: true });
const fixtureImage = path.join(fixtureDir, "feature-map-fixture.webp");
const replacementImage = path.join(fixtureDir, "feature-map-replacement.png");
copyFileSync(
	"apps/web/public/images/landing/hero-profile-preview-6c812da2.webp",
	fixtureImage,
);
copyFileSync("apps/web/public/images/kofi-support.png", replacementImage);
const fakeBrowserResponses = [];
const write = (feature, text) => {
	const directory = path.join(runDir, feature);
	mkdirSync(directory, { recursive: true });
	appendFileSync(path.join(directory, "actions.md"), `${text}\n`);
};
function result(feature, subfeature, status, evidence) {
	const row = { feature, subfeature, status, evidence };
	results.push(row);
	write(feature, `- ${subfeature}: ${status}. ${evidence}`);
}
async function proof(page, feature, name) {
	const folder = path.join(runDir, feature);
	await capture(page, folder, name);
}
async function installLocalApiMocks(context) {
	context.on("request", (request) => {
		const url = new URL(request.url());
		if (url.protocol === "https:")
			appendFileSync(
				path.join(runDir, "mock-browser-requests.log"),
				`${request.method()} ${url.hostname}${url.pathname}\n`,
			);
	});
	await context.route("https://**/*", (route) => route.abort());
	await context.route("https://images.example.test/**", (route) =>
		route.fulfill({
			contentType: "image/png",
			body: Buffer.from(
				"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/pZ8AAAAASUVORK5CYII=",
				"base64",
			),
		}),
	);
	await context.route("https://api.mapbox.com/**", async (route) => {
		const url = new URL(route.request().url());
		if (url.pathname.includes("/search/geocode/v6/forward")) {
			fakeBrowserResponses.push(
				`${route.request().method()} ${url.hostname}${url.pathname} 200 fake-geocoding`,
			);
			await route.fulfill({
				contentType: "application/json",
				body: JSON.stringify({
					features: [
						{
							id: "mapbox-local-fixture-1",
							geometry: { type: "Point", coordinates: [-122.4194, 37.7749] },
							properties: {
								mapbox_id: "mapbox-local-fixture-1",
								name: "Local Test Place",
								place_formatted: "San Francisco, CA",
							},
						},
					],
				}),
			});
		} else if (url.pathname.includes("/styles/v1/")) {
			fakeBrowserResponses.push(
				`${route.request().method()} ${url.hostname}${url.pathname} 200 fake-map-style`,
			);
			await route.fulfill({
				contentType: "application/json",
				body: JSON.stringify({
					version: 8,
					sources: {},
					layers: [
						{
							id: "fixture-background",
							type: "background",
							paint: { "background-color": "#e8e1d3" },
						},
					],
				}),
			});
		} else {
			fakeBrowserResponses.push(
				`${route.request().method()} ${url.hostname}${url.pathname} 204 fake-map-resource`,
			);
			await route.fulfill({ status: 204, body: "" });
		}
	});
	await context.route("https://events.mapbox.com/**", (route) => {
		fakeBrowserResponses.push(
			`POST events.mapbox.com${new URL(route.request().url()).pathname} 204 fake-event`,
		);
		return route.fulfill({ status: 204, body: "" });
	});
	await context.route(`${API}/media/**`, async (route) => {
		if (route.request().method() === "OPTIONS") {
			await route.fulfill({
				status: 204,
				headers: {
					"Access-Control-Allow-Origin": WEB,
					"Access-Control-Allow-Credentials": "true",
					"Access-Control-Allow-Methods": "PUT, OPTIONS",
					"Access-Control-Allow-Headers": "content-type",
				},
			});
			return;
		}
		const response = await route.fetch();
		fakeBrowserResponses.push(
			`${route.request().method()} ${new URL(API).host}${new URL(route.request().url()).pathname} ${response.status()} local-media`,
		);
		await route.fulfill({
			response,
			headers: {
				...response.headers(),
				"Access-Control-Allow-Origin": WEB,
				"Access-Control-Allow-Credentials": "true",
			},
		});
	});
}
async function waitForDb(
	query,
	expected = (value) => Boolean(value),
	timeout = 10000,
) {
	const until = Date.now() + timeout;
	while (Date.now() < until) {
		// Each query is a docker exec round trip that paces the loop, and it
		// runs async so route handlers keep answering the page meanwhile.
		const value = await dbAsync(query);
		if (expected(value)) return value;
	}
	return db(query);
}
async function rowCount(pageId) {
	return Number(
		db(`select count(*) from page_items where page_id='${pageId}'`),
	);
}
async function pageItem(pageId, type, marker) {
	return db(
		`select id from page_items where page_id='${pageId}' and type='${type}' and data::text like '%${marker}%' order by created_at desc limit 1`,
	);
}
function ownedImageKey(data) {
	try {
		return JSON.parse(data).imageKey ?? "";
	} catch {
		return "";
	}
}
async function ownedImageGetStatus(data) {
	const key = ownedImageKey(data);
	return key
		? page
				.context()
				.request.get(`${API}/media/${key}`)
				.then((response) => response.status())
				.catch(() => 0)
		: 0;
}
async function removeItem(page, itemId, pageId, feature) {
	if (!itemId) return false;
	const card = item(page, itemId);
	// After a reload the grid renders items once page data arrives.
	await card.waitFor({ state: "attached", timeout: 10000 });
	await card.scrollIntoViewIfNeeded();
	const remove = control(card, "button", "Delete item");
	await remove.waitFor({ state: "visible", timeout: 5000 });
	await remove.click();
	await card.waitFor({ state: "detached", timeout: 5000 }).catch(() => {});
	const count = Number(
		await waitForDb(
			`select count(*) from page_items where id='${itemId}' and page_id='${pageId}'`,
			(value) => value === "0",
			20000,
		),
	);
	const saveResponses = network
		.filter((entry) => entry.includes("/batch"))
		.slice(-3);
	write(
		feature,
		`Delete item ${itemId}; DOM removed=${!(await card.count())}; database row count after save: ${count}; recent batch responses=${saveResponses.join(",") || "none"}.`,
	);
	return count === 0;
}

mkdirSync(runDir, { recursive: true });
const network = [];
function watchPage(page) {
	page.on("response", (response) => {
		try {
			const url = new URL(response.url());
			if (url.origin === API)
				network.push(
					`${response.request().method()} ${url.pathname} ${response.status()}`,
				);
		} catch {}
	});
	page.on("pageerror", (error) =>
		appendFileSync(
			path.join(runDir, "browser-errors.txt"),
			`${redacted(error.message)}\n`,
		),
	);
	page.on("console", (message) => {
		if (message.type() === "error")
			appendFileSync(
				path.join(runDir, "browser-errors.txt"),
				`${redacted(message.text())}\n`,
			);
	});
}
const browser = await launchBrowser();
const journeys = createJourneys(browser, {
	prepareContext: installLocalApiMocks,
	preparePage: watchPage,
});
let page;
async function openOwner(feature) {
	page = await journeys.open(feature, {
		route: `/${HANDLE}`,
		storageState: STATE,
		permissions: ["clipboard-read", "clipboard-write"],
	});
	await control(page, "group", "Page editor toolbar").waitFor({
		timeout: 20000,
	});
}
// FEATUREMAP_JOURNEYS limits the run to some journey groups (drive-parallel.mjs);
// owner-baseline and cleanup always run because every group needs them.
const only = process.env.FEATUREMAP_JOURNEYS?.split(",");
const runs = (feature) => !only || only.includes(feature);
const loginUserId = db(`select id from "user" where email='${ACCOUNT}'`);
const observed = [];
let initialItemIds = "";
let textId = "";
let uploadedMediaId = "";
if (runs("sign-in-email-otp")) {
	const authDir = path.join(runDir, "sign-in-email-otp");
	mkdirSync(authDir, { recursive: true });
	const loginPage = await journeys.open("sign-in-email-otp");
	loginPage.on("response", (response) => {
		try {
			if (new URL(response.url()).origin === API) {
				const route = new URL(response.url()).pathname;
				observed.push(
					`${response.request().method()} ${route} ${response.status()}`,
				);
				if (route === "/auth/sign-in/email-otp")
					void response
						.text()
						.then((body) =>
							appendFileSync(
								path.join(authDir, "sign-in-response.txt"),
								`${response.status()} ${redacted(body).replace(/\b\d{6}\b/g, "[otp]")}\n`,
							),
						)
						.catch(() => {});
			}
		} catch {}
	});
	loginPage.on("request", (request) => {
		try {
			if (new URL(request.url()).origin === API)
				observed.push(
					`REQUEST ${request.method()} ${new URL(request.url()).pathname}`,
				);
		} catch {}
	});
	loginPage.on("requestfailed", (request) => {
		try {
			if (new URL(request.url()).origin === API)
				observed.push(
					`FAILED ${request.method()} ${new URL(request.url()).pathname}: ${request.failure()?.errorText ?? "unknown"}`,
				);
		} catch {}
	});
	await gotoReady(loginPage, "/sign-in");
	await proof(loginPage, "sign-in-email-otp", "sign-in-before");
	const loginEmail = control(loginPage, "textbox", "Email");
	await loginEmail.fill(ACCOUNT);
	const emailFilled = (await loginEmail.inputValue()) === ACCOUNT;
	const sendOtpButton = control(loginPage, "button", "Send OTP");
	const sendOtpEnabled = await sendOtpButton.isEnabled();
	await proof(loginPage, "sign-in-email-otp", "sign-in-filled");
	await sendOtpButton.click();
	const inboxPrompt = await control(loginPage, "heading", "Check your inbox")
		.waitFor({ timeout: 8000 })
		.then(() => true)
		.catch(() => false);
	await proof(
		loginPage,
		"sign-in-email-otp",
		inboxPrompt ? "otp-requested" : "otp-request-blocked",
	);
	result(
		"sign-in-email-otp",
		"otp-request",
		inboxPrompt ? "PASS" : "FAIL",
		inboxPrompt
			? "Fresh context submitted the local test email and showed Check your inbox; API request status recorded."
			: `환경 차단: email filled=${emailFilled}; Send OTP enabled=${sendOtpEnabled}; request outcomes=${observed.join("; ")}; form did not reach Check your inbox. Current screen: ${redacted((await body(loginPage).innerText()).replaceAll("\n", " | ")).slice(0, 180)}.`,
	);
	let sessionValid = false;
	let otpPromptAvailable = inboxPrompt;
	if (inboxPrompt) {
		await control(loginPage, "button", "Use a different email").click();
		const emailBox = control(loginPage, "textbox", "Email");
		const returnedToEmail = await emailBox.isVisible().catch(() => false);
		result(
			"sign-in-email-otp",
			"otp-change-email",
			returnedToEmail ? "PASS" : "FAIL",
			`Use a different email returned to email step=${returnedToEmail}.`,
		);
		if (returnedToEmail) {
			await emailBox.fill(ACCOUNT);
			await control(loginPage, "button", "Send OTP").click();
			otpPromptAvailable = await control(
				loginPage,
				"heading",
				"Check your inbox",
			)
				.waitFor({ timeout: 8000 })
				.then(() => true)
				.catch(() => false);
		}
		if (otpPromptAvailable) {
			const codeInput = otpInput(loginPage);
			const freshCode = db(
				`select split_part(value, ':', 1) from verification where identifier='sign-in-otp-${ACCOUNT}' and expires_at > now() order by created_at desc limit 1`,
			);
			if (/^\d{6}$/.test(freshCode)) {
				await codeInput.fill("");
				await codeInput.pressSequentially(freshCode, { delay: 80 });
				const inputMatched = (await codeInput.inputValue()) === freshCode;
				const verifyPromise = loginPage.waitForResponse(
					(response) => response.url().includes("/auth/sign-in/email-otp"),
					{ timeout: 10000 },
				);
				await control(loginPage, "button", "Verify code").click();
				const verifyResponse = await verifyPromise.catch(() => null);
				await settled(loginPage);
				const sessionResponse = await loginPage
					.context()
					.request.get(`${API}/auth/get-session`);
				const sessionJson = await sessionResponse.json().catch(() => null);
				const sessionCookies = await loginPage.context().cookies();
				sessionValid =
					sessionResponse.ok() &&
					Boolean(sessionJson?.user?.id) &&
					sessionCookies.length > 0;
				await proof(loginPage, "sign-in-email-otp", "otp-verified");
				result(
					"sign-in-email-otp",
					"otp-verify",
					sessionValid ? "PASS" : "FAIL",
					`Fresh context submitted database OTP (field matched DB value=${inputMatched}, POST status=${verifyResponse?.status() ?? "no response"}); GET /auth/get-session ${sessionResponse.status()}, valid user session=${sessionValid}. OTP value omitted.`,
				);
			} else {
				result(
					"sign-in-email-otp",
					"otp-verify",
					"FAIL",
					"환경 차단: inbox screen appeared but no unexpired six-digit OTP was available in the isolated DB.",
				);
			}
		} else {
			result(
				"sign-in-email-otp",
				"otp-verify",
				"FAIL",
				`환경 차단: OTP prompt could not be reopened after Use a different email. API outcomes=${observed.join("; ")}.`,
			);
		}
	} else {
		result(
			"sign-in-email-otp",
			"otp-change-email",
			"FAIL",
			"환경 차단: OTP request did not reach the inbox step, so email-change control was unavailable.",
		);
		result(
			"sign-in-email-otp",
			"otp-verify",
			"FAIL",
			"환경 차단: OTP request did not reach the inbox step in this fresh context.",
		);
	}
	const expectedLanding = loginPage.url();
	result(
		"sign-in-email-otp",
		"otp-landing",
		sessionValid &&
			loginUserId &&
			expectedLanding.startsWith(WEB) &&
			!expectedLanding.endsWith("/sign-in")
			? "PASS"
			: "FAIL",
		`Existing account reached ${new URL(expectedLanding).pathname}; verified session=${sessionValid}; account row read from isolated DB.`,
	);
	write("sign-in-email-otp", `API outcomes: ${observed.join("; ")}`);

	// The login probe above must not replace the separately maintained owner session.
}
await openOwner("owner-baseline");
const pageId = db(
	`select id from pages where handle='${HANDLE}' and user_id='${loginUserId}'`,
);
if (!pageId)
	throw new Error("Expected page row was not found in isolated database.");
await proof(page, "owner-baseline", "owner-page");
const planRow = db(
	`select product_id || ':' || status from creem_subscription where reference_id='${loginUserId}' limit 1`,
);
write(
	"owner-baseline",
	`Fresh browser context loaded /${HANDLE}; page id ${pageId}; local subscription readback ${planRow}.`,
);
if (planRow !== "local-pro:active")
	throw new Error(
		`Expected local Pro fixture, read back ${planRow || "no subscription"}.`,
	);

if (runs("editor-page-sharing")) {
	await openOwner("editor-page-sharing");
	// Sharing: visible dialog, clipboard result, and mobile entry point.
	try {
		await control(page, "button", "Share page").click();
		const dialog = control(page, "dialog", "Share your page");
		await dialog.waitFor({ state: "visible" });
		const qrVisible = await control(dialog, "img", "QR code for your page")
			.isVisible()
			.catch(() => false);
		await proof(page, "editor-page-sharing", "share-dialog");
		result(
			"editor-page-sharing",
			"share-open",
			"PASS",
			"Owner clicked Share page and the Share your page dialog appeared.",
		);
		result(
			"editor-page-sharing",
			"share-qr",
			qrVisible ? "PASS" : "FAIL",
			`QR graphic visible=${qrVisible}; QR address content is not checked.`,
		);
		await control(dialog, "button", "Copy Link").click();
		// The feedback is transient, so wait for it rather than for saves.
		const copied = await exactText(dialog, "Copied Link")
			.waitFor({ state: "visible", timeout: 5000 })
			.then(() => true)
			.catch(() => false);
		const clipboard = await page
			.evaluate(() => navigator.clipboard.readText())
			.catch(() => "");
		result(
			"editor-page-sharing",
			"share-copy",
			copied && clipboard === `${WEB}/${HANDLE}` ? "PASS" : "FAIL",
			`Copy feedback visible=${copied}; clipboard matched public page URL=${clipboard === `${WEB}/${HANDLE}`}.`,
		);
		await control(dialog, "button", "Close")
			.click()
			.catch(() => page.keyboard.press("Escape"));
		await dialog.waitFor({ state: "hidden", timeout: 5000 }).catch(() => {});
		await page.setViewportSize({ width: 390, height: 844 });
		await reloadReady(page);
		await settled(page);
		const mobileShare = control(page, "button", "Share link");
		await mobileShare.waitFor({ state: "visible" });
		await mobileShare.click();
		const mobileDialog = control(page, "dialog", "Share your page");
		let mobileOpened = await mobileDialog
			.waitFor({ state: "visible", timeout: 5000 })
			.then(() => true)
			.catch(() => false);
		if (!mobileOpened) {
			await settled(page);
			await mobileShare.click().catch(() => {});
			mobileOpened = await mobileDialog
				.waitFor({ state: "visible", timeout: 3000 })
				.then(() => true)
				.catch(() => false);
		}
		await proof(page, "editor-page-sharing", "share-mobile");
		const mobileScreen = redacted(
			(await body(page).innerText()).replaceAll("\n", " | "),
		).slice(0, 160);
		result(
			"editor-page-sharing",
			"share-mobile",
			mobileOpened ? "PASS" : "FAIL",
			`At 390px viewport, Share link opened dialog=${mobileOpened}; screen=${mobileScreen}.`,
		);
		await page.keyboard.press("Escape");
		await page.setViewportSize({ width: 1365, height: 900 });
	} catch (error) {
		for (const id of ["share-open", "share-qr", "share-copy", "share-mobile"])
			result(
				"editor-page-sharing",
				id,
				"FAIL",
				`실행 실패: ${redacted(error.message)}`,
			);
	}
}
if (runs("editor-profile-and-handle")) {
	await openOwner("editor-profile-and-handle");
	// Owner profile name/bio and page handle are changed and restored through the UI.
	const originalName = await control(page, "textbox", "Name")
		.inputValue()
		.catch(() => "");
	const originalBio = await control(page, "textbox", "Bio")
		.inputValue()
		.catch(() => "");
	try {
		const name = control(page, "textbox", "Name");
		const bio = control(page, "textbox", "Bio");
		await name.fill("Feature map local owner");
		await name.press("Tab");
		await bio.fill("Temporary browser verification profile.");
		await bio.press("Tab");
		await settled(page);
		const profileRead = db(
			`select coalesce(name,'') || '|' || coalesce(bio,'') from pages where id='${pageId}'`,
		);
		result(
			"editor-profile-and-handle",
			"profile-name-bio",
			profileRead ===
				"Feature map local owner|Temporary browser verification profile."
				? "PASS"
				: "FAIL",
			`UI edit followed by pages-row readback: ${profileRead}.`,
		);
		await reloadReady(page);
		result(
			"editor-profile-and-handle",
			"profile-persist",
			(await name.inputValue()) === "Feature map local owner" &&
				(await bio.inputValue()) === "Temporary browser verification profile."
				? "PASS"
				: "FAIL",
			"Reloaded owner page and checked profile fields.",
		);
		await proof(page, "editor-profile-and-handle", "profile-saved");
		await control(page, "button", "Open page options").click();
		await exactText(page, "Change handle").click();
		const changeDialog = control(page, "dialog");
		await changeDialog.waitFor({ state: "visible" });
		const handleBox = control(changeDialog, "textbox");
		await handleBox.fill("featuremap-temp-check");
		await labelled(changeDialog, "Handle available").waitFor();
		await control(changeDialog, "button", "Change handle").click();
		await page.waitForURL("**/featuremap-temp-check", { timeout: 10000 });
		const changed = db(`select handle from pages where id='${pageId}'`);
		result(
			"editor-profile-and-handle",
			"page-handle-change",
			changed === "featuremap-temp-check" ? "PASS" : "FAIL",
			`Change handle dialog submitted; browser path=${new URL(page.url()).pathname}; DB handle=${changed}.`,
		);
		await control(page, "button", "Open page options").click();
		await exactText(page, "Change handle").click();
		const restoreDialog = control(page, "dialog");
		await control(restoreDialog, "textbox").fill(HANDLE);
		await labelled(restoreDialog, "Handle available").waitFor();
		await control(restoreDialog, "button", "Change handle").click();
		await page.waitForURL(`**/${HANDLE}`, { timeout: 10000 });
	} catch (error) {
		for (const id of [
			"profile-name-bio",
			"profile-persist",
			"page-handle-change",
		])
			if (
				!results.some(
					(r) =>
						r.feature === "editor-profile-and-handle" && r.subfeature === id,
				)
			)
				result(
					"editor-profile-and-handle",
					id,
					"FAIL",
					`실행 실패: ${redacted(error.message)}`,
				);
	}
	await control(page, "textbox", "Name").fill(originalName);
	await control(page, "textbox", "Bio").fill(originalBio);
	await settled(page);
	const originalImage = db(
		`select coalesce(image_key,'') || '|' || coalesce(image_crop::text,'') from pages where id='${pageId}'`,
	);
	try {
		const chooseProfileImage = page.waitForEvent("filechooser", {
			timeout: 5000,
		});
		await control(page, "button", "Change profile image").click();
		await (await chooseProfileImage).setFiles(fixtureImage);
		const uploadedImage = await waitForDb(
			`select coalesce(image_key,'') from pages where id='${pageId}'`,
			(value) => Boolean(value) && value !== originalImage.split("|")[0],
			20000,
		);
		result(
			"editor-profile-and-handle",
			"profile-image-upload",
			uploadedImage ? "PASS" : "FAIL",
			`Visible file chooser selected the local fixture; pages.image_key changed=${Boolean(uploadedImage)}; image_key readback=${uploadedImage || "empty"}.`,
		);
		await proof(page, "editor-profile-and-handle", "profile-image-uploaded");
		if (uploadedImage) {
			const crop = control(page, "button", "Crop profile image");
			await crop.hover();
			await crop.click();
			const cropSurface = marker(page, "data-page-image-crop-open");
			await cropSurface.waitFor({ state: "visible", timeout: 5000 });
			const imageBox = await control(
				page,
				"button",
				"Change profile image",
			).boundingBox();
			if (imageBox) {
				await page.mouse.move(
					imageBox.x + imageBox.width / 2,
					imageBox.y + imageBox.height / 2,
				);
				await page.mouse.down();
				await page.mouse.move(
					imageBox.x + imageBox.width / 2 + 18,
					imageBox.y + imageBox.height / 2 + 12,
					{ steps: 8 },
				);
				await page.mouse.up();
			}
			await control(page, "button", "Apply profile image crop").click();
			await settled(page);
			const cropped = db(
				`select coalesce(image_key,'') || '|' || coalesce(image_crop::text,'') from pages where id='${pageId}'`,
			);
			result(
				"editor-profile-and-handle",
				"profile-image-crop",
				cropped.includes("|") && cropped !== `${uploadedImage}|`
					? "PASS"
					: "FAIL",
				`Crop controls opened and applied; page image/crop row=${cropped}.`,
			);
			await control(page, "button", "Change profile image").hover();
			await control(page, "button", "Remove profile image").click();
			const removed = await waitForDb(
				`select coalesce(image_key,'') || '|' || coalesce(image_crop::text,'') from pages where id='${pageId}'`,
				(value) => value.startsWith("|"),
				15000,
			);
			result(
				"editor-profile-and-handle",
				"profile-image-remove",
				removed.startsWith("|") ? "PASS" : "FAIL",
				`Remove profile image clicked; pages.image_key/image_crop readback=${removed || "not cleared"}.`,
			);
			await reloadReady(page);
			result(
				"editor-profile-and-handle",
				"profile-image-remove-persist",
				!(await marker(page, "data-page-image-crop-open").count()) &&
					db(
						`select coalesce(image_key,'') from pages where id='${pageId}'`,
					) === ""
					? "PASS"
					: "FAIL",
				"Reloaded after removal and confirmed no profile image key remains.",
			);
		}
	} catch (error) {
		for (const id of [
			"profile-image-upload",
			"profile-image-crop",
			"profile-image-remove",
		])
			if (
				!results.some(
					(r) =>
						r.feature === "editor-profile-and-handle" && r.subfeature === id,
				)
			)
				result(
					"editor-profile-and-handle",
					id,
					"FAIL",
					`실행 실패: ${redacted(error.message)}`,
				);
	}
	const profileImageNow = db(
		`select coalesce(image_key,'') || '|' || coalesce(image_crop::text,'') from pages where id='${pageId}'`,
	);
	if (profileImageNow !== originalImage && originalImage.startsWith("|")) {
		try {
			await control(page, "button", "Change profile image").hover();
			await control(page, "button", "Remove profile image").click();
			await waitForDb(
				`select coalesce(image_key,'') || '|' || coalesce(image_crop::text,'') from pages where id='${pageId}'`,
				(value) => value === originalImage,
				15000,
			);
		} catch (error) {
			write(
				"cleanup",
				`Profile image cleanup could not restore the original empty image state: ${redacted(error.message)}`,
			);
		}
	}
}
if (runs("editor-add-item")) {
	await openOwner("editor-add-item");
	// Build reversible text/link/section/map items from the toolbar, then read the DB.
	const leftovers = db(
		`select id from page_items where page_id='${pageId}' and (data::text like '%Feature map temporary%' or data::text like '%Feature map section%' or data::text like '%featuremap-metadata%')`,
	);
	for (const itemId of leftovers.split("\n").filter(Boolean))
		await removeItem(page, itemId, pageId, "cleanup-prior-run").catch(
			() => false,
		);
	initialItemIds = db(
		`select coalesce(string_agg(id, ','), '') from page_items where page_id='${pageId}'`,
	);
	const createdItemIds = [];
	// The toolbar can render before its child editor effect registers add actions after a full reload.
	await settled(page);
	try {
		await control(page, "button", "Add text").click();
		await proof(page, "editor-add-item", "add-text-clicked");
		const textInput = control(page, "textbox", "Text content").last();
		write(
			"editor-add-item",
			`After Add text click: visible textareas=${await control(page, "textbox", "Text content").filter({ visible: true }).count()}; visible page items=${await items(page).filter({ visible: true }).count()}; DB item count=${await rowCount(pageId)}.`,
		);
		await textInput.waitFor({ state: "visible", timeout: 10000 });
		await textInput.fill("Feature map temporary text");
		await proof(page, "editor-add-item", "add-text-filled");
		await textInput.press("Tab");
		await settled(page);
		const textId = await waitForDb(
			`select id from page_items where page_id='${pageId}' and type='text' and data::text like '%Feature map temporary text%' order by created_at desc limit 1`,
		);
		if (textId) createdItemIds.push(textId);
		result(
			"editor-add-item",
			"add-text",
			textId ? "PASS" : "FAIL",
			`Add text UI; page_items text row id=${textId || "missing"}.`,
		);
		await proof(page, "editor-add-item", "text-added");
		const textCountBefore = await rowCount(pageId);
		await control(page, "button", "Add section").click();
		const sectionInput = control(page, "textbox", "Section title").last();
		await sectionInput.fill("Feature map section");
		await sectionInput.press("Tab");
		await settled(page);
		const sectionId = await waitForDb(
			`select id from page_items where page_id='${pageId}' and type='section' and data::text like '%Feature map section%' order by created_at desc limit 1`,
		);
		if (sectionId) createdItemIds.push(sectionId);
		result(
			"editor-add-item",
			"add-section",
			sectionId ? "PASS" : "FAIL",
			`Section title entered; page_items row id=${sectionId || "missing"}.`,
		);
		await control(page, "button", "Add link").click();
		const linkInput = control(page, "textbox", "Link URL").last();
		await linkInput.fill("https://example.com/featuremap-metadata");
		await linkInput.press("Enter");
		await settled(page);
		const linkId = await waitForDb(
			`select id from page_items where page_id='${pageId}' and type='link' and data::text like '%featuremap-metadata%' order by created_at desc limit 1`,
		);
		if (linkId) createdItemIds.push(linkId);
		result(
			"editor-add-item",
			"add-link",
			linkId ? "PASS" : "FAIL",
			`Add link editor saved URL; page_items row id=${linkId || "missing"}.`,
		);
		await control(page, "button", "Add map").click();
		await settled(page);
		const mapId = await waitForDb(
			`select id from page_items where page_id='${pageId}' and type='map' order by created_at desc limit 1`,
		);
		if (mapId) createdItemIds.push(mapId);
		result(
			"editor-add-item",
			"add-map",
			mapId ? "PASS" : "FAIL",
			`Add map toolbar created a map row id=${mapId || "missing"}.`,
		);
		const textAfterReload = await pageItem(
			pageId,
			"text",
			"Feature map temporary text",
		);
		await reloadReady(page);
		result(
			"editor-add-item",
			"item-persist",
			textAfterReload &&
				(await pageItem(pageId, "text", "Feature map temporary text")) ===
					textAfterReload
				? "PASS"
				: "FAIL",
			`Reloaded in authenticated context; text item id=${textAfterReload || "missing"} still in DB.`,
		);
		const sectionAfterReload = await pageItem(
			pageId,
			"section",
			"Feature map section",
		);
		const linkAfterReload = await pageItem(
			pageId,
			"link",
			"featuremap-metadata",
		);
		const mapAfterReload = db(
			`select id from page_items where id='${mapId}' and page_id='${pageId}' and type='map'`,
		);
		result(
			"editor-add-item",
			"section-persist",
			sectionAfterReload === sectionId ? "PASS" : "FAIL",
			`Reloaded and checked section row id=${sectionAfterReload || "missing"}.`,
		);
		result(
			"editor-add-item",
			"link-persist",
			linkAfterReload === linkId ? "PASS" : "FAIL",
			`Reloaded and checked link row id=${linkAfterReload || "missing"}.`,
		);
		result(
			"editor-add-item",
			"map-persist",
			mapAfterReload === mapId ? "PASS" : "FAIL",
			`Reloaded and checked map row id=${mapAfterReload || "missing"}.`,
		);
		let deleteError = "";
		const deleteOk = await removeItem(
			page,
			mapId,
			pageId,
			"editor-add-item",
		).catch((error) => {
			deleteError = redacted(error.message);
			return false;
		});
		result(
			"editor-add-item",
			"delete-item",
			deleteOk ? "PASS" : "FAIL",
			`Delete control removed the map item created by this journey; database row absence after save=${deleteOk}.${deleteError ? ` Error: ${deleteError}` : ""}`,
		);
		write(
			"editor-add-item",
			`Initial page item ids: ${initialItemIds}; count before add sequence: ${textCountBefore}; created IDs: ${createdItemIds.join(",")}.`,
		);
	} catch (error) {
		for (const id of [
			"add-text",
			"add-section",
			"add-link",
			"add-map",
			"delete-item",
			"item-persist",
			"section-persist",
			"link-persist",
			"map-persist",
		])
			if (
				!results.some(
					(r) => r.feature === "editor-add-item" && r.subfeature === id,
				)
			)
				result(
					"editor-add-item",
					id,
					"FAIL",
					`실행 실패: ${redacted(error.message)}`,
				);
	}
}
if (runs("editor-text-formatting")) {
	await openOwner("editor-text-formatting");
	// Text formatting: modify text through the visible item controls, save, reload, restore by deletion.
	textId = await pageItem(pageId, "text", "Feature map temporary text");
	if (textId) {
		const textCard = item(page, textId);
		try {
			await control(textCard, "textbox", "Text content").fill(
				"Feature map formatted text",
			);
			await control(textCard, "button", "Open text style options").click();
			const alignCenter = control(page, "button", "Align text center");
			await alignCenter.click();
			const centerPressed = await alignCenter.getAttribute("aria-pressed");
			const alignBottom = control(page, "button", "Align text to the bottom");
			await alignBottom.click();
			const bottomPressed = await alignBottom.getAttribute("aria-pressed");
			await control(
				page,
				"button",
				"Toggle text background color options",
			).click();
			await control(page, "radio", "Blue").click();
			const customColor = control(page, "textbox", "Text background hex color");
			await customColor.fill("#123abc");
			await customColor.press("Enter");
			await settled(page);
			const textData = db(
				`select data::text || '|' || style::text from page_items where id='${textId}'`,
			);
			result(
				"editor-text-formatting",
				"text-content-edit",
				textData.includes("Feature map formatted text") ? "PASS" : "FAIL",
				`Content saved in page_items: ${textData.slice(0, 200)}.`,
			);
			result(
				"editor-text-formatting",
				"text-align",
				centerPressed === "true" ? "PASS" : "FAIL",
				`Align text center aria-pressed=${centerPressed}.`,
			);
			result(
				"editor-text-formatting",
				"text-vertical-align",
				bottomPressed === "true" ? "PASS" : "FAIL",
				`Align text to the bottom aria-pressed=${bottomPressed}.`,
			);
			result(
				"editor-text-formatting",
				"text-background",
				textData.toLowerCase().includes("#123abc") ? "PASS" : "FAIL",
				`Selected Blue then committed #123abc; style/data readback ${textData.slice(0, 200)}.`,
			);
			await reloadReady(page);
			const persisted = db(
				`select data::text || '|' || style::text from page_items where id='${textId}'`,
			);
			result(
				"editor-text-formatting",
				"text-format-persist",
				persisted === textData ? "PASS" : "FAIL",
				"Reloaded editor and confirmed the same saved data/style row.",
			);
			await proof(page, "editor-text-formatting", "formatted-text");
		} catch (error) {
			for (const id of [
				"text-content-edit",
				"text-align",
				"text-vertical-align",
				"text-background",
				"text-format-persist",
			])
				if (
					!results.some(
						(r) =>
							r.feature === "editor-text-formatting" && r.subfeature === id,
					)
				)
					result(
						"editor-text-formatting",
						id,
						"FAIL",
						`실행 실패: ${redacted(error.message)}`,
					);
		}
	} else {
		for (const id of [
			"text-content-edit",
			"text-align",
			"text-vertical-align",
			"text-background",
			"text-format-persist",
		])
			result(
				"editor-text-formatting",
				id,
				"FAIL",
				"환경 차단: text item was not saved by the owner editor, so formatting UI was unavailable.",
			);
	}
}
if (runs("editor-layout")) {
	await openOwner("editor-layout");
	// Layout controls and visible selection; persistence depends on successful user interaction.
	try {
		await control(page, "tab", "Edit compact layout").click();
		await settled(page);
		const compact = await control(
			page,
			"tab",
			"Edit compact layout",
		).getAttribute("aria-selected");
		await proof(page, "editor-layout", "compact-layout-selected");
		await control(page, "tab", "Edit wide layout").click();
		await settled(page);
		const wide = await control(page, "tab", "Edit wide layout").getAttribute(
			"aria-selected",
		);
		await proof(page, "editor-layout", "wide-layout-selected");
		result(
			"editor-layout",
			"layout-compact",
			compact === "true" ? "PASS" : "FAIL",
			`Compact layout selected attribute=${compact}.`,
		);
		result(
			"editor-layout",
			"layout-wide",
			wide === "true" ? "PASS" : "FAIL",
			`Wide layout selected attribute=${wide}.`,
		);
		const layoutTargetId = db(
			`select id from page_items where page_id='${pageId}' and type='text' and data::text like '%Feature map formatted text%' order by created_at desc limit 1`,
		);
		const firstCard = item(page, layoutTargetId);
		const boundsBefore = await firstCard.boundingBox().catch(() => null);
		const targetLayoutsBefore = layoutTargetId
			? db(`select layouts::text from page_items where id='${layoutTargetId}'`)
			: "";
		if (boundsBefore) {
			await page.mouse.move(boundsBefore.x + 5, boundsBefore.y + 5);
			await page.mouse.down();
			await page.mouse.move(boundsBefore.x + 183, boundsBefore.y + 183, {
				steps: 16,
			});
			await page.mouse.up();
			await settled(page);
			const boundsAfter = await firstCard.boundingBox().catch(() => null);
			const layoutAfterDrag = await waitForDb(
				`select layouts::text from page_items where id='${layoutTargetId}'`,
				(value) => value !== targetLayoutsBefore,
				10000,
			);
			result(
				"editor-layout",
				"layout-drag",
				boundsAfter &&
					(boundsAfter.x !== boundsBefore.x ||
						boundsAfter.y !== boundsBefore.y) &&
					layoutAfterDrag !== targetLayoutsBefore
					? "PASS"
					: "FAIL",
				`Pointer drag bounds before=${JSON.stringify(boundsBefore)} after=${JSON.stringify(boundsAfter)}; saved layout changed=${layoutAfterDrag !== targetLayoutsBefore}; readback=${layoutAfterDrag}.`,
			);
		} else
			result(
				"editor-layout",
				"layout-drag",
				"FAIL",
				"환경 차단: no visible card existed to drag.",
			);
		const layoutBeforeReload = layoutTargetId
			? db(`select layouts::text from page_items where id='${layoutTargetId}'`)
			: "";
		await reloadReady(page);
		const layoutAfterReload = layoutTargetId
			? db(`select layouts::text from page_items where id='${layoutTargetId}'`)
			: "";
		result(
			"editor-layout",
			"layout-persist",
			layoutTargetId &&
				layoutBeforeReload === layoutAfterReload &&
				layoutAfterReload !== targetLayoutsBefore
				? "PASS"
				: "FAIL",
			`Target item ${layoutTargetId || "missing"}; before drag=${targetLayoutsBefore}; saved=${layoutBeforeReload}; after reload=${layoutAfterReload}.`,
		);
		const reloadedLayoutCard = item(page, layoutTargetId);
		await reloadedLayoutCard.hover().catch(() => {});
		await proof(page, "editor-layout", "layout-controls-hovered");
		const preset = control(reloadedLayoutCard, "button", "Full square");
		if (
			await preset
				.waitFor({ state: "visible", timeout: 5000 })
				.then(() => true)
				.catch(() => false)
		) {
			await preset.click();
			await settled(page);
			const presetLayout = db(
				`select layouts::text from page_items where id='${layoutTargetId}'`,
			);
			result(
				"editor-layout",
				"layout-preset",
				presetLayout !== layoutAfterReload ? "PASS" : "FAIL",
				`Selected Full square; DB layout changed=${presetLayout !== layoutAfterReload}; readback=${presetLayout}.`,
			);
		} else
			result(
				"editor-layout",
				"layout-preset",
				"FAIL",
				"환경 차단: Full square preset control was not exposed for the current card.",
			);
		await proof(page, "editor-layout", "layout-state");
	} catch (error) {
		for (const id of [
			"layout-compact",
			"layout-wide",
			"layout-drag",
			"layout-preset",
			"layout-persist",
		])
			if (
				!results.some(
					(r) => r.feature === "editor-layout" && r.subfeature === id,
				)
			)
				result(
					"editor-layout",
					id,
					"FAIL",
					`실행 실패: ${redacted(error.message)}`,
				);
	}
}
if (runs("editor-advanced-widgets")) {
	await openOwner("editor-advanced-widgets");
	// Advanced widgets catalog, search, navigation, mobile, and placeholders.
	try {
		await control(page, "button", "Advanced").click();
		let widgetDialog = control(page, "dialog", "Advanced widgets");
		await widgetDialog.waitFor({ state: "visible" });
		result(
			"editor-advanced-widgets",
			"widget-catalog",
			"PASS",
			"Advanced widgets catalog dialog appeared on the local Pro owner page.",
		);
		await control(widgetDialog, "textbox", "Search widgets").fill("spotify");
		await control(widgetDialog, "button", "Spotify").click();
		const detailDialog = control(page, "dialog");
		const spotifyDetail = (await detailDialog.innerText()).includes("Spotify");
		await control(detailDialog, "button", "Back to widgets").click();
		widgetDialog = control(page, "dialog", "Advanced widgets");
		result(
			"editor-advanced-widgets",
			"widget-navigation",
			spotifyDetail ? "PASS" : "FAIL",
			`Spotify detail opened and Back to widgets returned=${spotifyDetail}.`,
		);
		await control(widgetDialog, "textbox", "Search widgets").fill(
			"featuremap-no-such-widget",
		);
		const empty = await exactText(widgetDialog, "No widgets found.")
			.isVisible()
			.catch(() => false);
		result(
			"editor-advanced-widgets",
			"widget-search",
			empty ? "PASS" : "FAIL",
			`Missing-name search showed No widgets found=${empty}.`,
		);
		await control(widgetDialog, "button", "Close").click();
		const closed = await widgetDialog
			.waitFor({ state: "hidden", timeout: 5000 })
			.then(() => true)
			.catch(() => false);
		await page.setViewportSize({ width: 390, height: 844 });
		await settled(page);
		await control(page, "button", "Advanced").click();
		const mobileDialog = control(page, "dialog", "Advanced widgets");
		const mobileOpen = await mobileDialog
			.waitFor({ state: "visible", timeout: 5000 })
			.then(() => true)
			.catch(() => false);
		if (mobileOpen)
			await proof(page, "editor-advanced-widgets", "widget-mobile-picker");
		await page.mouse.click(10, 10);
		await mobileDialog
			.waitFor({ state: "hidden", timeout: 5000 })
			.catch(() => {});
		const mobileDismissed = await mobileDialog.isHidden().catch(() => false);
		result(
			"editor-advanced-widgets",
			"widget-mobile-picker",
			mobileOpen && closed && mobileDismissed ? "PASS" : "FAIL",
			`Close button closed desktop picker=${closed}; 390px picker opened=${mobileOpen} and was dismissed by tapping outside=${mobileDismissed}.`,
		);
		await page.setViewportSize({ width: 1365, height: 900 });
		await settled(page);
		await page.setViewportSize({ width: 1365, height: 900 });
		for (const name of ["SoundCloud", "Apple Music", "Signature"]) {
			await control(page, "button", "Advanced").click();
			const d = control(page, "dialog", "Advanced widgets");
			await control(d, "textbox", "Search widgets").fill(name);
			const itemButton = control(d, "button", name);
			if (await itemButton.isVisible().catch(() => false)) {
				await itemButton.click();
				await proof(
					page,
					"editor-advanced-widgets",
					`placeholder-${name.toLowerCase().replaceAll(" ", "-")}`,
				);
				const detail = control(page, "dialog");
				const text = await detail.innerText();
				const placeholderVisible = text.includes(
					"Sipping coffee while crafting a polished widget",
				);
				const actionCount = await controlsExcept(detail, "button", [
					"Back to widgets",
					"Close",
				]).count();
				result(
					"editor-advanced-widgets",
					"widget-coming-soon",
					placeholderVisible && actionCount === 0 ? "PASS" : "FAIL",
					`${name} placeholder visible=${placeholderVisible}; buttons besides Back/Close=${actionCount}; detail=${redacted(text).slice(0, 150)}.`,
				);
				await control(detail, "button", "Back to widgets").click();
				await control(
					control(page, "dialog", "Advanced widgets"),
					"button",
					"Close",
				).click();
			} else
				result(
					"editor-advanced-widgets",
					"widget-coming-soon",
					"FAIL",
					`환경 차단: ${name} was not visible in the filtered catalog.`,
				);
			if (await control(page, "dialog").count())
				await control(control(page, "dialog"), "button", "Close")
					.click()
					.catch(() => {});
		}
		const gateRowBeforeRaw = db(
			"select to_jsonb(subscription)::text from creem_subscription subscription where reference_id='" +
				loginUserId +
				"' and product_id='local-pro' limit 1",
		);
		const gateRowBefore = gateRowBeforeRaw
			? JSON.parse(gateRowBeforeRaw)
			: null;
		const subscriptionBeforeGate = gateRowBefore?.status ?? "";
		let freeGateShown = false;
		let freeGateEvidence = "";
		let gateContext;
		try {
			if (subscriptionBeforeGate === "active" && gateRowBefore?.period_end) {
				write(
					"editor-advanced-widgets",
					"Plan gate DB before=" +
						JSON.stringify({
							status: gateRowBefore.status,
							period_end: gateRowBefore.period_end,
						}) +
						".",
				);
				db(
					"update creem_subscription set status='canceled', period_end=now() - interval '1 minute' where id='" +
						gateRowBefore.id +
						"'",
				);
				const gateRowExpired = db(
					"select status || '|' || (period_end < now())::text from creem_subscription where id='" +
						gateRowBefore.id +
						"'",
				);
				const gatePage = await journeys.extra({ storageState: STATE });
				gateContext = gatePage.context();
				await gotoReady(gatePage, `/${HANDLE}`);
				await control(gatePage, "group", "Page editor toolbar").waitFor({
					timeout: 20000,
				});
				await control(gatePage, "button", "Advanced").click();
				const gateCatalog = control(gatePage, "dialog", "Advanced widgets");
				await control(gateCatalog, "button", "Spotify").click();
				const gateDialog = control(gatePage, "dialog", "Upgrade to Pro");
				freeGateShown = await gateDialog
					.waitFor({ state: "visible", timeout: 5000 })
					.then(() => true)
					.catch(() => false);
				freeGateEvidence =
					"Local row readback before UI=" +
					gateRowExpired +
					"; fresh authenticated context opened /" +
					HANDLE +
					"; choosing Spotify showed Upgrade to Pro=" +
					freeGateShown +
					".";
				await proof(
					gatePage,
					"editor-advanced-widgets",
					"widget-free-plan-gate",
				);
				await gateContext.close();
				gateContext = undefined;
			} else {
				freeGateEvidence =
					"Cannot safely toggle the local plan because original row status=" +
					(subscriptionBeforeGate || "missing") +
					" or period_end was empty.";
			}
		} catch (error) {
			freeGateEvidence =
				"Free-gate UI attempt failed after isolated status/period_end change=" +
				(gateRowBefore ? "yes" : "no") +
				": " +
				redacted(error.message) +
				".";
		} finally {
			if (gateContext) await gateContext.close().catch(() => {});
			if (gateRowBefore) {
				const periodEndSql = gateRowBefore.period_end
					? `'${gateRowBefore.period_end}'::timestamptz`
					: "NULL";
				db(
					"update creem_subscription set status='" +
						gateRowBefore.status +
						"', period_end=" +
						periodEndSql +
						" where id='" +
						gateRowBefore.id +
						"'",
				);
				const restoredRaw = db(
					"select to_jsonb(subscription)::text from creem_subscription subscription where id='" +
						gateRowBefore.id +
						"'",
				);
				const restoredRow = restoredRaw ? JSON.parse(restoredRaw) : null;
				write(
					"editor-advanced-widgets",
					"Plan gate DB restored=" +
						JSON.stringify({
							status: restoredRow?.status,
							period_end: restoredRow?.period_end,
						}) +
						"; exact status+period_end restored=" +
						(restoredRow?.status === gateRowBefore.status &&
							restoredRow?.period_end === gateRowBefore.period_end) +
						".",
				);
			}
		}
		const subscriptionAfterGate = db(
			"select product_id || ':' || status || ':' || (period_end = '" +
				(gateRowBefore?.period_end ?? "") +
				"'::timestamptz)::text from creem_subscription where reference_id='" +
				loginUserId +
				"' and product_id='local-pro' limit 1",
		);
		const freeGateStatus =
			freeGateShown && subscriptionAfterGate === "local-pro:active:true"
				? "PASS"
				: "FAIL";
		result(
			"editor-advanced-widgets",
			"widget-plan-gate",
			freeGateStatus,
			freeGateEvidence +
				" Restored Pro row readback=" +
				subscriptionAfterGate +
				".",
		);

		try {
			await control(page, "button", "Advanced").click();
			const catalog = control(page, "dialog", "Advanced widgets");
			await control(catalog, "textbox", "Search widgets").fill("spotify");
			await control(catalog, "button", "Spotify").click();
			const detail = control(page, "dialog");
			const spotifyResponsePromise = page
				.waitForResponse(
					(response) =>
						response.url().includes("/widgets/preview") &&
						response.request().method() === "POST",
					{ timeout: 15000 },
				)
				.catch(() => null);
			await control(detail, "textbox", "Spotify URL").fill(
				"https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC",
			);
			const spotifyResponse = await spotifyResponsePromise;
			if (spotifyResponse?.status() !== 200) {
				const responseBody =
					(await spotifyResponse?.text().catch(() => "")) ?? "";
				result(
					"editor-advanced-widgets",
					"widget-add-spotify",
					"FAIL",
					`환경 차단: fake/local Spotify preview POST=${spotifyResponse?.status() ?? "no response"}; Add remained unavailable; response=${redacted(responseBody).slice(0, 180)}.`,
				);
				await control(detail, "button", "Back to widgets")
					.click()
					.catch(() => {});
				await control(
					control(page, "dialog", "Advanced widgets"),
					"button",
					"Close",
				)
					.click()
					.catch(() => {});
			} else {
				const addSpotify = control(detail, "button", "Add");
				await addSpotify.waitFor({ state: "visible", timeout: 10000 });
				await addSpotify.waitFor({ state: "attached" });
				await addSpotify.click();
				const spotifyId = await waitForDb(
					`select id from page_items where page_id='${pageId}' and type='spotify' order by created_at desc limit 1`,
					Boolean,
					15000,
				);
				result(
					"editor-advanced-widgets",
					"widget-add-spotify",
					spotifyId ? "PASS" : "FAIL",
					`Submitted Spotify URL through UI; preview POST=200; saved row=${spotifyId || "missing"}.`,
				);
				if (spotifyId)
					await proof(page, "editor-advanced-widgets", "spotify-added");
			}
		} catch (error) {
			result(
				"editor-advanced-widgets",
				"widget-add-spotify",
				"FAIL",
				`실행 실패: ${redacted(error.message)}; server mock requests are recorded in mock-outbound.log.`,
			);
		}
		const remainingWidgetDialog = control(page, "dialog").last();
		if (await remainingWidgetDialog.count()) {
			if (
				await control(remainingWidgetDialog, "button", "Back to widgets")
					.isVisible()
					.catch(() => false)
			)
				await control(remainingWidgetDialog, "button", "Back to widgets")
					.click()
					.catch(() => {});
			await control(
				control(page, "dialog", "Advanced widgets"),
				"button",
				"Close",
			)
				.click()
				.catch(() => {});
		}
		try {
			await control(page, "button", "Advanced").click();
			const catalog = control(page, "dialog", "Advanced widgets");
			await control(catalog, "textbox", "Search widgets").fill("RSS Feed");
			const rssFeedButton = control(catalog, "button", "RSS Feed");
			await rssFeedButton.waitFor({ state: "visible", timeout: 5000 });
			await rssFeedButton.click();
			const detail = control(page, "dialog");
			await control(detail, "textbox", "RSS feed URL").fill(
				"https://featuremap.hashnode.dev",
			);
			const rssResponsePromise = page
				.waitForResponse(
					(response) =>
						response.url().includes("/widgets/preview") &&
						response.request().method() === "POST",
					{ timeout: 15000 },
				)
				.catch(() => null);
			await control(detail, "button", "Add").click();
			const rssResponse = await rssResponsePromise;
			const rssId = await waitForDb(
				`select id from page_items where page_id='${pageId}' and type='rss' order by created_at desc limit 1`,
				Boolean,
				15000,
			);
			result(
				"editor-advanced-widgets",
				"widget-add-rss",
				rssId && rssResponse?.status() === 200 ? "PASS" : "FAIL",
				rssResponse?.status() === 200
					? `Submitted RSS feed URL through UI; preview POST=200; saved row=${rssId || "missing"}.`
					: `환경 차단: fake/local RSS preview POST=${rssResponse?.status() ?? "no response"}; saved row=${rssId || "missing"}.`,
			);
			if (rssId) await proof(page, "editor-advanced-widgets", "rss-added");
			else {
				await control(detail, "button", "Back to widgets")
					.click()
					.catch(() => {});
				await control(
					control(page, "dialog", "Advanced widgets"),
					"button",
					"Close",
				)
					.click()
					.catch(() => {});
			}
		} catch (error) {
			result(
				"editor-advanced-widgets",
				"widget-add-rss",
				"FAIL",
				`실행 실패: ${redacted(error.message)}; server mock requests are recorded in mock-outbound.log.`,
			);
			const openDialog = control(page, "dialog").last();
			if (await openDialog.count()) {
				await control(openDialog, "button", "Back to widgets")
					.click()
					.catch(() => {});
				await control(
					control(page, "dialog", "Advanced widgets"),
					"button",
					"Close",
				)
					.click()
					.catch(() => {});
			}
		}
		const leftoverAdvancedPicker = control(page, "dialog", "Advanced widgets");
		if (await leftoverAdvancedPicker.isVisible().catch(() => false)) {
			await control(leftoverAdvancedPicker, "button", "Close")
				.click()
				.catch(() => {});
			await leftoverAdvancedPicker
				.waitFor({ state: "hidden", timeout: 5000 })
				.catch(() => {});
		}
	} catch (error) {
		for (const id of [
			"widget-catalog",
			"widget-search",
			"widget-navigation",
			"widget-mobile-picker",
			"widget-plan-gate",
			"widget-coming-soon",
			"widget-add-spotify",
			"widget-add-rss",
		])
			if (
				!results.some(
					(r) => r.feature === "editor-advanced-widgets" && r.subfeature === id,
				)
			)
				result(
					"editor-advanced-widgets",
					id,
					"FAIL",
					`실행 실패: ${redacted(error.message)}`,
				);
	}
}
if (runs("editor-map-editing")) {
	await openOwner("editor-map-editing");
	// Map add and local search through the mocked geocoder.
	const mapExisting = await pageItem(pageId, "map", "");
	if (!mapExisting) {
		try {
			await control(page, "button", "Add map").click();
			await settled(page);
		} catch {}
	}
	const persistedMapId = db(
		`select id from page_items where page_id='${pageId}' and type='map' order by created_at desc limit 1`,
	);
	result(
		"editor-map-editing",
		"map-add",
		persistedMapId ? "PASS" : "FAIL",
		`Owner Add map resulted in local page_items row=${persistedMapId || "missing"}.`,
	);
	if (persistedMapId) {
		const mapItem = item(page, persistedMapId);
		await mapItem.waitFor({ state: "visible", timeout: 10000 }).catch(() => {});
		// Mapbox renders its region after the map scrolls into view and loads.
		await mapItem.scrollIntoViewIfNeeded().catch(() => {});
		const mapRegionVisible = await control(mapItem, "region", "Map")
			.waitFor({ state: "visible", timeout: 15000 })
			.then(() => true)
			.catch(() => false);
		result(
			"editor-map-editing",
			"map-visible",
			mapRegionVisible ? "PASS" : "FAIL",
			`After Add map and hydration wait, map region visible=${mapRegionVisible}.`,
		);
		await proof(page, "editor-map-editing", "map-added");
		const beforeMap = db(
			`select data::text from page_items where id='${persistedMapId}'`,
		);
		let searchResult = false;
		let selectedMap = "";
		try {
			await mapItem.scrollIntoViewIfNeeded();
			await mapItem.waitFor({ state: "visible", timeout: 10000 });
			await control(mapItem, "button", "Search location").click();
			const search = control(page, "combobox", "Search location");
			await search.fill("Seattle");
			const option = content(page, "option", "Local Test Place");
			await option.waitFor({ state: "visible", timeout: 8000 });
			await option.click();
			await settled(page);
			selectedMap = db(
				`select data::text from page_items where id='${persistedMapId}'`,
			);
			searchResult =
				selectedMap !== beforeMap &&
				/latitude|longitude|place|location/i.test(selectedMap);
			result(
				"editor-map-editing",
				"map-search",
				searchResult ? "PASS" : "FAIL",
				`Browser search used fake Mapbox result Local Test Place; selected row changed=${selectedMap !== beforeMap}; data=${selectedMap.slice(0, 220)}.`,
			);
			await proof(page, "editor-map-editing", "map-search-result");
		} catch (error) {
			result(
				"editor-map-editing",
				"map-search",
				"FAIL",
				`실행 실패: ${redacted(error.message)}; fake Mapbox requests are recorded in mock-browser-requests.log.`,
			);
		}
		await removeItem(page, persistedMapId, pageId, "editor-map-editing").catch(
			() => false,
		);
	} else {
		result(
			"editor-map-editing",
			"map-search",
			"FAIL",
			"환경 차단: map item did not save, so its location search control was unavailable.",
		);
	}
}
if (runs("editor-link-metadata")) {
	await openOwner("editor-link-metadata");
	// Link metadata from an example.com public URL, record its actual API result.
	const linkId = await pageItem(pageId, "link", "featuremap-metadata");
	if (linkId) {
		const linkCard = item(page, linkId);
		try {
			await control(linkCard, "button", "Edit link URL").click();
			const refresh = control(page, "button", "Refresh link metadata");
			await refresh.click();
			await settled(page);
			const refreshResponse = network.filter((x) => x.includes("metadata"));
			const metadata = db(
				`select data::text from page_items where id='${linkId}'`,
			);
			result(
				"editor-link-metadata",
				"link-add",
				"PASS",
				`Owner link card already saved with URL; page_items row id=${linkId}.`,
			);
			result(
				"editor-link-metadata",
				"link-metadata",
				metadata.includes("title") || metadata.includes("description")
					? "PASS"
					: "FAIL",
				`Metadata fields present after refresh=${metadata.includes("title") || metadata.includes("description")}; row=${metadata.slice(0, 180)}.`,
			);
			result(
				"editor-link-metadata",
				"link-metadata-refresh",
				refreshResponse.some((x) => x.endsWith("200")) ? "PASS" : "FAIL",
				`Refresh request observations=${refreshResponse.join("; ") || "no metadata response"}; row=${metadata.slice(0, 180)}.`,
			);
			await reloadReady(page);
			const after = db(
				`select data::text from page_items where id='${linkId}'`,
			);
			result(
				"editor-link-metadata",
				"link-persist",
				after.includes("featuremap-metadata") ? "PASS" : "FAIL",
				`After reload, URL/data row retained=${after.includes("featuremap-metadata")}.`,
			);
			await proof(page, "editor-link-metadata", "link-details");
		} catch (error) {
			for (const id of [
				"link-add",
				"link-metadata",
				"link-metadata-refresh",
				"link-persist",
			])
				if (
					!results.some(
						(r) => r.feature === "editor-link-metadata" && r.subfeature === id,
					)
				)
					result(
						"editor-link-metadata",
						id,
						"FAIL",
						`실행 실패: ${redacted(error.message)}`,
					);
		}
	} else
		for (const id of [
			"link-add",
			"link-metadata",
			"link-metadata-refresh",
			"link-persist",
		])
			result(
				"editor-link-metadata",
				id,
				"FAIL",
				"환경 차단: saved link card was unavailable in the owner page.",
			);
}
if (runs("editor-inline-destination-url")) {
	await openOwner("editor-inline-destination-url");
	// Optional destinations on text; media destination waits for local upload support.
	if (textId) {
		const card = item(page, textId);
		try {
			await control(card, "button", "Open text style options").click();
			const addLink = control(page, "button", "Add text link");
			await addLink.click();
			const destination = control(page, "textbox", "Link URL").last();
			await destination.fill("https://example.com/featuremap-text");
			await destination.press("Enter");
			await settled(page);
			let data = db(`select data::text from page_items where id='${textId}'`);
			result(
				"editor-inline-destination-url",
				"text-destination-add",
				data.includes("featuremap-text") ? "PASS" : "FAIL",
				`Entered URL in Add text link; data row includes target=${data.includes("featuremap-text")}.`,
			);
			await destination.press("Escape").catch(() => {});
			if (
				(await control(card, "button", "Open text style options").getAttribute(
					"aria-expanded",
				)) !== "true"
			)
				await control(card, "button", "Open text style options").click();
			await control(page, "button", "Edit text link").click();
			const editInput = control(page, "textbox", "Link URL").last();
			await editInput.fill("https://example.com/featuremap-updated");
			await editInput.press("Enter");
			await settled(page);
			data = db(`select data::text from page_items where id='${textId}'`);
			result(
				"editor-inline-destination-url",
				"destination-edit",
				data.includes("featuremap-updated") ? "PASS" : "FAIL",
				`Changed target and read back updated=${data.includes("featuremap-updated")}.`,
			);
			await editInput.press("Escape").catch(() => {});
			if (
				(await control(card, "button", "Open text style options").getAttribute(
					"aria-expanded",
				)) !== "true"
			)
				await control(card, "button", "Open text style options").click();
			await control(page, "button", "Edit text link").click();
			const validInput = control(page, "textbox", "Link URL").last();
			await validInput.fill("not a url");
			await validInput.press("Enter");
			await settled(page);
			data = db(`select data::text from page_items where id='${textId}'`);
			result(
				"editor-inline-destination-url",
				"destination-validation",
				data.includes("featuremap-updated") ? "PASS" : "FAIL",
				`Invalid URL retained last valid URL=${data.includes("featuremap-updated")}; stored row checked.`,
			);
			await reloadReady(page);
			data = db(`select data::text from page_items where id='${textId}'`);
			result(
				"editor-inline-destination-url",
				"destination-persist",
				data.includes("featuremap-updated") ? "PASS" : "FAIL",
				`After reload, updated destination remains=${data.includes("featuremap-updated")}.`,
			);
			await control(card, "button", "Open text style options").click();
			const editAgain = control(page, "button", "Edit text link");
			await editAgain.click();
			const clear = control(page, "textbox", "Link URL").last();
			await clear.fill("");
			await clear.press("Enter");
			await settled(page);
			data = db(`select data::text from page_items where id='${textId}'`);
			result(
				"editor-inline-destination-url",
				"destination-clear",
				!data.includes("featuremap-updated") ? "PASS" : "FAIL",
				`Cleared destination and confirmed URL removed=${!data.includes("featuremap-updated")}.`,
			);
			await proof(page, "editor-inline-destination-url", "destination-cleared");
		} catch (error) {
			for (const id of [
				"text-destination-add",
				"destination-edit",
				"destination-validation",
				"destination-persist",
				"destination-clear",
			])
				if (
					!results.some(
						(r) =>
							r.feature === "editor-inline-destination-url" &&
							r.subfeature === id,
					)
				)
					result(
						"editor-inline-destination-url",
						id,
						"FAIL",
						`실행 실패: ${redacted(error.message)}`,
					);
		}
	} else
		for (const id of [
			"text-destination-add",
			"destination-edit",
			"destination-validation",
			"destination-persist",
			"destination-clear",
		])
			result(
				"editor-inline-destination-url",
				id,
				"FAIL",
				"환경 차단: no saved text card was available.",
			);
}
if (runs("editor-media-upload")) {
	await openOwner("editor-media-upload");
	// Upload through the local-only object route, then use the same saved item for editing.
	try {
		const chooserPromise = page
			.waitForEvent("filechooser", { timeout: 5000 })
			.catch(() => null);
		await control(page, "button", "Add media").click();
		const chooser = await chooserPromise;
		if (!chooser)
			throw new Error(
				"The exact Add media control did not open the file chooser.",
			);
		await chooser.setFiles(fixtureImage);
		await proof(page, "editor-media-upload", "media-picker-open");
		result(
			"editor-media-upload",
			"media-add",
			"PASS",
			"Owner clicked Add media, selected the local fixture in the native file chooser, and the media item appeared.",
		);
		uploadedMediaId = await waitForDb(
			`select id from page_items where page_id='${pageId}' and type='media' order by created_at desc limit 1`,
			Boolean,
			20000,
		);
		const mediaCard = uploadedMediaId
			? item(page, uploadedMediaId)
			: items(page).last();
		await mediaCard.waitFor({ state: "visible", timeout: 10000 });
		const mediaDataText = db(
			`select data::text from page_items where id='${uploadedMediaId}'`,
		);
		const mediaData = JSON.parse(mediaDataText || "{}");
		const objectKey = mediaData.objectKey ?? "";
		const mediaUrl =
			mediaData.mediaUrl ?? (objectKey ? `${API}/media/${objectKey}` : "");
		const localMediaStatus = mediaUrl
			? await page
					.context()
					.request.get(mediaUrl)
					.then((response) => response.status())
					.catch(() => 0)
			: 0;
		const uploadRequests = network.filter((entry) =>
			/upload|media/.test(entry),
		);
		const uploadPass = Boolean(
			uploadedMediaId &&
				objectKey &&
				localMediaStatus === 200 &&
				!uploadRequests.some((entry) =>
					entry.includes("cloudflarestorage.com"),
				),
		);
		result(
			"editor-media-upload",
			"media-upload",
			uploadPass ? "PASS" : "FAIL",
			`Local upload API observations=${uploadRequests.join("; ") || "none"}; page_items id=${uploadedMediaId || "missing"}; object key present=${Boolean(objectKey)}; local media GET status=${localMediaStatus}; no Cloudflare R2 request observed.`,
		);
		await proof(page, "editor-media-upload", "media-uploaded");
		await reloadReady(page);
		const persistedMedia = db(
			`select id from page_items where id='${uploadedMediaId}' and page_id='${pageId}' and type='media'`,
		);
		result(
			"editor-media-upload",
			"media-upload-persist",
			persistedMedia === uploadedMediaId ? "PASS" : "FAIL",
			`After reload, media row id=${persistedMedia || "missing"}; local media GET status=${localMediaStatus}.`,
		);
		await mediaCard.waitFor({ state: "visible", timeout: 10000 });
		const originalMediaRows = Number(
			db(
				`select count(*) from page_items where page_id='${pageId}' and type='media'`,
			),
		);
		let releaseUpload;
		const uploadHeld = new Promise((resolve) => {
			releaseUpload = resolve;
		});
		let putIntercepted = false;
		let markPutHeld;
		const putHeld = new Promise((resolve) => {
			markPutHeld = resolve;
		});
		await page.route(`${API}/media/**`, async (route) => {
			if (route.request().method() !== "PUT") return route.continue();
			putIntercepted = true;
			markPutHeld();
			await uploadHeld;
			await route.abort("aborted").catch(() => {});
		});
		const cancelChooserPromise = page
			.waitForEvent("filechooser", { timeout: 5000 })
			.catch(() => null);
		const pendingUploadResponse = page
			.waitForResponse(
				(response) =>
					response.url() === `${API}/pages/${HANDLE}/items/upload` &&
					response.request().method() === "POST",
				{ timeout: 10000 },
			)
			.catch(() => null);
		await control(page, "button", "Add media").click();
		const cancelChooser = await cancelChooserPromise;
		if (!cancelChooser)
			throw new Error(
				"The exact Add media control did not open the file chooser.",
			);
		await cancelChooser.setFiles(replacementImage);
		await blobPreview(items(page))
			.first()
			.waitFor({ timeout: 10000 })
			.catch(() => {});
		const pendingCard = items(page).last();
		const pendingId = await pendingCard.getAttribute("data-bento-item-id");
		// The pending card is not saved to page_items until its upload finishes,
		// so its object key comes from the upload URL response.
		const pendingKey =
			(await (await pendingUploadResponse)?.json().catch(() => null))
				?.objectKey ?? "";
		const pendingDelete = control(pendingCard, "button", "Delete item");
		await pendingDelete.waitFor({ state: "visible", timeout: 5000 });
		// Cancel while the storage PUT is provably in flight and held, then
		// wait for the app's cancel request before letting the PUT go, so the
		// order is upload created -> PUT held -> cancel -> PUT aborted.
		await putHeld;
		const cancelResponse = page
			.waitForResponse(
				(response) =>
					response.url() === `${API}/pages/${HANDLE}/items/upload/cancel` &&
					response.request().method() === "POST",
				{ timeout: 10000 },
			)
			.catch(() => null);
		await pendingDelete.click();
		const cancelStatus = (await cancelResponse)?.status() ?? 0;
		releaseUpload();
		await page.unroute(`${API}/media/**`);
		const pendingRowGone = pendingId
			? (await waitForDb(
					`select count(*) from page_items where id='${pendingId}'`,
					(value) => value === "0",
					20000,
				)) === "0"
			: false;
		const mediaRowsAfterCancel = Number(
			db(
				`select count(*) from page_items where page_id='${pageId}' and type='media'`,
			),
		);
		const pendingAssetState = pendingKey
			? await waitForDb(
					`select status||':'||(delete_after > now())::text from page_media_assets where object_key='${pendingKey}'`,
					(value) => value === "pending_delete:true",
					15000,
				)
			: "";
		const pendingObjectStatus = pendingKey
			? await page
					.context()
					.request.get(`${API}/media/${pendingKey}`)
					.then((response) => response.status())
					.catch(() => 0)
			: 404;
		const cancelPass =
			putIntercepted &&
			cancelStatus === 204 &&
			pendingRowGone &&
			mediaRowsAfterCancel === originalMediaRows &&
			pendingAssetState === "pending_delete:true";
		result(
			"editor-media-upload",
			"media-cancel",
			cancelPass ? "PASS" : "FAIL",
			`Held local PUT intercepted=${putIntercepted}; cancel request status=${cancelStatus}; pending item ${pendingId || "missing"} row removed=${pendingRowGone}; page media asset=${pendingAssetState || "missing"}; deleteAfter future=true; object GET=${pendingObjectStatus} (may remain available during cleanup grace); media rows before=${originalMediaRows}, after=${mediaRowsAfterCancel}.`,
		);
		await proof(page, "editor-media-upload", "media-cancelled");
	} catch (error) {
		await proof(page, "editor-media-upload", "media-add-failed").catch(
			() => {},
		);
		const fileInputState = await fileInput(page)
			.evaluateAll((nodes) =>
				nodes.map((node) => ({
					accept: node.getAttribute("accept"),
					ariaLabel: node.getAttribute("aria-label"),
					disabled: node.disabled,
					visible: Boolean(node.getClientRects().length),
				})),
			)
			.catch(() => []);
		write(
			"editor-media-upload",
			`File chooser failure diagnostics: Add media buttons=${await control(
				page,
				"button",
				"Add media",
			)
				.count()
				.catch(() => 0)}; file inputs=${JSON.stringify(fileInputState)}.`,
		);
		for (const id of ["media-add", "media-upload", "media-cancel"])
			result(
				"editor-media-upload",
				id,
				"FAIL",
				`실행 실패: media journey stopped before completion: ${redacted(error.message)}`,
			);
	}
}
if (runs("editor-media-editing")) {
	await openOwner("editor-media-editing");
	if (uploadedMediaId) {
		const mediaCard = item(page, uploadedMediaId);
		try {
			const mediaRowBefore = db(
				`select data::text from page_items where id='${uploadedMediaId}'`,
			);
			await control(mediaCard, "textbox", "Media caption").fill(
				"Feature map media caption",
			);
			await settled(page);
			const captionData = db(
				`select data::text from page_items where id='${uploadedMediaId}'`,
			);
			result(
				"editor-media-editing",
				"media-caption",
				captionData.includes("Feature map media caption") ? "PASS" : "FAIL",
				`Media caption saved in row=${captionData.includes("Feature map media caption")}; item data=${captionData.slice(0, 220)}.`,
			);
			await control(mediaCard, "button", "Crop media").click();
			const cropFrame = marker(mediaCard, "data-bento-item-crop-open");
			await cropFrame.waitFor({ state: "visible", timeout: 5000 });
			const dragCrop = control(mediaCard, "button", "Drag media to crop");
			const cropBox = await dragCrop.boundingBox();
			if (cropBox) {
				await page.mouse.move(
					cropBox.x + cropBox.width / 2,
					cropBox.y + cropBox.height / 2,
				);
				await page.mouse.down();
				await page.mouse.move(
					cropBox.x + cropBox.width / 2 + 20,
					cropBox.y + cropBox.height / 2 + 14,
					{ steps: 8 },
				);
				await page.mouse.up();
			}
			await control(mediaCard, "button", "Apply media crop").click();
			await settled(page);
			const croppedData = db(
				`select data::text from page_items where id='${uploadedMediaId}'`,
			);
			result(
				"editor-media-editing",
				"media-crop",
				croppedData !== captionData ? "PASS" : "FAIL",
				`Crop control applied; row changed=${croppedData !== captionData}; data=${croppedData.slice(0, 220)}.`,
			);
			await reloadReady(page);
			const persistedData = db(
				`select data::text from page_items where id='${uploadedMediaId}'`,
			);
			result(
				"editor-media-editing",
				"media-edit-persist",
				persistedData === croppedData &&
					persistedData.includes("Feature map media caption")
					? "PASS"
					: "FAIL",
				`After reload caption/crop data remained=${persistedData === croppedData}; row=${persistedData.slice(0, 220)}.`,
			);
			await proof(page, "editor-media-editing", "media-edited");
			void mediaRowBefore;
		} catch (error) {
			for (const id of ["media-caption", "media-crop", "media-edit-persist"])
				if (
					!results.some(
						(r) => r.feature === "editor-media-editing" && r.subfeature === id,
					)
				)
					result(
						"editor-media-editing",
						id,
						"FAIL",
						`실행 실패: ${redacted(error.message)}`,
					);
		}
		try {
			const mediaCard2 = item(page, uploadedMediaId);
			await control(mediaCard2, "button", "Add media link").click();
			const destination = control(page, "textbox", "Link URL").last();
			await destination.fill("https://example.com/featuremap-media");
			await destination.press("Enter");
			await settled(page);
			const data = db(
				`select data::text from page_items where id='${uploadedMediaId}'`,
			);
			result(
				"editor-inline-destination-url",
				"media-destination-add",
				data.includes("featuremap-media") ? "PASS" : "FAIL",
				`Added optional destination to uploaded media; page_items row includes target=${data.includes("featuremap-media")}.`,
			);
			await proof(
				page,
				"editor-inline-destination-url",
				"media-destination-added",
			);
		} catch (error) {
			result(
				"editor-inline-destination-url",
				"media-destination-add",
				"FAIL",
				`실행 실패: ${redacted(error.message)}`,
			);
		}
	} else {
		for (const id of ["media-caption", "media-crop", "media-edit-persist"])
			result(
				"editor-media-editing",
				id,
				"FAIL",
				"환경 차단: the media upload journey did not produce a saved local media item.",
			);
	}
}
if (runs("editor-link-card-images")) {
	await openOwner("editor-link-card-images");
	const linkImageId = await pageItem(pageId, "link", "featuremap-metadata");
	if (linkImageId) {
		const linkCard = item(page, linkImageId);
		try {
			// Image controls exist only on presets with an image area; this journey
			// sets its own precondition instead of inheriting another journey's layout.
			await control(linkCard, "button", "Full square").click();
			await settled(page);
			const before = db(
				`select data::text from page_items where id='${linkImageId}'`,
			);
			const addImageChooserPromise = page
				.waitForEvent("filechooser", { timeout: 5000 })
				.catch(() => null);
			await control(linkCard, "button", "Add link image").click();
			const addImageChooser = await addImageChooserPromise;
			if (addImageChooser) await addImageChooser.setFiles(fixtureImage);
			else await fileInput(linkCard, "image/*").setInputFiles(fixtureImage);
			const added = await waitForDb(
				`select data::text from page_items where id='${linkImageId}'`,
				(value) => value !== before && value.includes("imageKey"),
				20000,
			);
			const addedGet = await ownedImageGetStatus(added);
			result(
				"editor-link-card-images",
				"link-image-add",
				ownedImageKey(added) && addedGet === 200 ? "PASS" : "FAIL",
				`Selected local image; link row imageKey present=${Boolean(ownedImageKey(added))}; local object GET=${addedGet}; row=${added.slice(0, 180)}.`,
			);
			const replaceChooserPromise = page
				.waitForEvent("filechooser", { timeout: 5000 })
				.catch(() => null);
			await control(linkCard, "button", "Replace link image").click();
			const replaceChooser = await replaceChooserPromise;
			if (replaceChooser) await replaceChooser.setFiles(replacementImage);
			else await fileInput(linkCard, "image/*").setInputFiles(replacementImage);
			const replaced = await waitForDb(
				`select data::text from page_items where id='${linkImageId}'`,
				(value) => value !== added,
				20000,
			);
			const replacedGet = await ownedImageGetStatus(replaced);
			result(
				"editor-link-card-images",
				"link-image-replace",
				replaced !== added && ownedImageKey(replaced) && replacedGet === 200
					? "PASS"
					: "FAIL",
				`Selected a second local image; link row changed=${replaced !== added}; local object GET=${replacedGet}; row=${replaced.slice(0, 180)}.`,
			);
			await reloadReady(page);
			const persisted = db(
				`select data::text from page_items where id='${linkImageId}'`,
			);
			const persistedGet = await ownedImageGetStatus(persisted);
			result(
				"editor-link-card-images",
				"link-image-persist",
				persisted === replaced &&
					ownedImageKey(persisted) &&
					persistedGet === 200
					? "PASS"
					: "FAIL",
				`After reload image key remains=${persisted === replaced && Boolean(ownedImageKey(persisted))}; local object GET=${persistedGet}; row=${persisted.slice(0, 180)}.`,
			);
			await control(linkCard, "button", "Remove link image").click();
			const removed = await waitForDb(
				`select data::text from page_items where id='${linkImageId}'`,
				(value) =>
					!value.includes("imageKey") || value.includes('"imageKey":null'),
				15000,
			);
			result(
				"editor-link-card-images",
				"link-image-remove",
				!removed.includes('"imageKey":"') ? "PASS" : "FAIL",
				`Remove link image clicked; row has no non-null imageKey=${!removed.includes('"imageKey":"')}; row=${removed.slice(0, 180)}.`,
			);
			await proof(page, "editor-link-card-images", "link-image-removed");
		} catch (error) {
			for (const id of [
				"link-image-add",
				"link-image-replace",
				"link-image-remove",
				"link-image-persist",
			])
				if (
					!results.some(
						(r) =>
							r.feature === "editor-link-card-images" && r.subfeature === id,
					)
				)
					result(
						"editor-link-card-images",
						id,
						"FAIL",
						`실행 실패: ${redacted(error.message)}`,
					);
		}
	} else
		for (const id of [
			"link-image-add",
			"link-image-replace",
			"link-image-remove",
			"link-image-persist",
		])
			result(
				"editor-link-card-images",
				id,
				"FAIL",
				"환경 차단: saved owner link card is unavailable.",
			);
}
if (runs("editor-tweet")) {
	await openOwner("editor-tweet");
	// Tweet preview and invalid status are served by the isolated outbound mock.
	try {
		await control(page, "button", "Advanced").click();
		const d = control(page, "dialog", "Advanced widgets");
		await control(d, "textbox", "Search widgets").fill("tweet");
		const tweetButton = control(d, "button", "Tweet");
		await tweetButton.click();
		const tweetDialog = control(page, "dialog", "Tweet");
		const tweetInputVisible = await control(
			tweetDialog,
			"textbox",
			"Tweet ID or URL",
		)
			.isVisible()
			.catch(() => false);
		result(
			"editor-tweet",
			"tweet-open",
			tweetInputVisible ? "PASS" : "FAIL",
			`Advanced picker opened Tweet dialog; Tweet ID or URL field visible=${tweetInputVisible}.`,
		);
		await proof(page, "editor-tweet", "tweet-dialog");
		const tweetId = "1234567890123456789";
		const tweetRowBefore = Number(
			db(
				`select count(*) from page_items where page_id='${pageId}' and type='tweet'`,
			),
		);
		await control(tweetDialog, "textbox", "Tweet ID or URL").fill(
			`https://x.com/featuremap/status/${tweetId}`,
		);
		const validTweetResponse = page
			.waitForResponse(
				(response) =>
					response.url().includes("/widgets/preview") &&
					response.request().method() === "POST",
				{ timeout: 15000 },
			)
			.catch(() => null);
		await control(tweetDialog, "button", "Add").click();
		const validResponse = await validTweetResponse;
		const savedTweetId = await waitForDb(
			`select id from page_items where page_id='${pageId}' and type='tweet' and data::text like '%${tweetId}%' order by created_at desc limit 1`,
			Boolean,
			15000,
		);
		result(
			"editor-tweet",
			"tweet-add",
			savedTweetId && validResponse?.status() === 200 ? "PASS" : "FAIL",
			`Submitted mock public status in the dialog; preview POST=${validResponse?.status() ?? "no response"}; tweet page_items row=${savedTweetId || "missing"}; before count=${tweetRowBefore}.`,
		);
		await reloadReady(page);
		const savedTweetAfterReload = db(
			`select id from page_items where id='${savedTweetId}' and page_id='${pageId}' and type='tweet'`,
		);
		result(
			"editor-tweet",
			"tweet-persist",
			savedTweetAfterReload === savedTweetId ? "PASS" : "FAIL",
			`Reloaded owner page; tweet row retained=${savedTweetAfterReload === savedTweetId}.`,
		);
		await proof(page, "editor-tweet", "tweet-added");
		await control(page, "button", "Advanced").click();
		const invalidCatalog = control(page, "dialog", "Advanced widgets");
		await control(invalidCatalog, "textbox", "Search widgets").fill("tweet");
		await control(invalidCatalog, "button", "Tweet").click();
		const invalidDialog = control(page, "dialog", "Tweet");
		await control(invalidDialog, "textbox", "Tweet ID or URL").fill(
			"https://x.com/featuremap/status/0",
		);
		const invalidTweetResponse = page
			.waitForResponse(
				(response) =>
					response.url().includes("/widgets/preview") &&
					response.request().method() === "POST",
				{ timeout: 15000 },
			)
			.catch(() => null);
		await control(invalidDialog, "button", "Add").click();
		const invalidResponse = await invalidTweetResponse;
		const invalidError = await control(invalidDialog, "alert")
			.innerText()
			.catch(() => "");
		const tweetRowAfterInvalid = Number(
			db(
				`select count(*) from page_items where page_id='${pageId}' and type='tweet'`,
			),
		);
		result(
			"editor-tweet",
			"tweet-invalid",
			invalidResponse?.status() === 502 &&
				invalidError.includes("Could not add this post") &&
				tweetRowAfterInvalid === tweetRowBefore + 1
				? "PASS"
				: "FAIL",
			`Mock unavailable ID response=${invalidResponse?.status() ?? "no response"}; visible error=${invalidError || "none"}; no extra row=${tweetRowAfterInvalid === tweetRowBefore + 1}.`,
		);
		await proof(page, "editor-tweet", "tweet-invalid");
		await page.keyboard.press("Escape");
	} catch (error) {
		for (const id of ["tweet-open", "tweet-add", "tweet-invalid"])
			if (
				!results.some(
					(r) => r.feature === "editor-tweet" && r.subfeature === id,
				)
			)
				result(
					"editor-tweet",
					id,
					"FAIL",
					`실행 실패: ${redacted(error.message)}`,
				);
	}
}
await openOwner("cleanup");
// Restore all feature-map page changes; leave the account/page and local Pro grant intact.
const currentRows = db(`select id from page_items where page_id='${pageId}'`);
for (const itemId of currentRows.split("\n").filter(Boolean)) {
	if (initialItemIds.split(",").includes(itemId)) continue;
	try {
		await removeItem(page, itemId, pageId, "cleanup");
	} catch (error) {
		write(
			"cleanup",
			`Could not remove temporary item ${itemId}: ${redacted(error.message)}`,
		);
	}
}
await gotoReady(page, `/${HANDLE}`);
const restoredProfile = db(
	`select coalesce(name,'') || '|' || coalesce(bio,'') from pages where id='${pageId}'`,
);
const leftItemRows = db(
	`select count(*) from page_items where page_id='${pageId}' and id not in (${
		initialItemIds
			? initialItemIds
					.split(",")
					.map((id) => `'${id}'`)
					.join(",")
			: "''"
	})`,
);
write(
	"cleanup",
	`Restored handle=${db(`select handle from pages where id='${pageId}'`) === HANDLE}; profile=${restoredProfile}; temporary item rows remaining=${leftItemRows}.`,
);

const sha = execFileSync("git", ["rev-parse", "HEAD"], {
	encoding: "utf8",
}).trim();
const features = [
	"sign-in-email-otp",
	"editor-add-item",
	"editor-media-upload",
	"editor-profile-and-handle",
	"editor-layout",
	"editor-text-formatting",
	"editor-media-editing",
	"editor-map-editing",
	"editor-link-card-images",
	"editor-link-metadata",
	"editor-inline-destination-url",
	"editor-tweet",
	"editor-advanced-widgets",
	"editor-page-sharing",
];
const summaries = features.map((feature) => {
	const rows = results.filter((row) => row.feature === feature);
	const status =
		rows.length > 0 && rows.every((row) => row.status === "PASS")
			? "PASS"
			: "FAIL";
	return { feature, status, subfeatures: rows };
});
await journeys.close();
writeFileSync(
	path.join(runDir, "results.json"),
	`${JSON.stringify({ sha, run: path.basename(runDir), summaries, timings: journeys.timings, network }, null, 2)}\n`,
);
writeFileSync(
	path.join(runDir, "mock-browser-responses.log"),
	`${fakeBrowserResponses.join("\n")}\n`,
);
writeFileSync(
	path.join(runDir, "results.md"),
	[
		"# Feature map run results",
		"",
		`Checkout SHA: ${sha}`,
		`Run directory: ${runDir}`,
		`Authenticated owner: ${HANDLE}; local plan readback: ${planRow}`,
		"",
		"| Feature | Result | Sub-feature evidence |",
		"| --- | --- | --- |",
		...summaries.map(
			(summary) =>
				`| ${summary.feature} | ${summary.status} | ${summary.subfeatures.map((r) => `${r.subfeature}: ${r.status} (${r.evidence.replaceAll("|", "/")})`).join("<br>")} |`,
		),
		"",
		`API responses observed: ${[...observed, ...network].join("; ")}`,
	].join("\n"),
);
await browser.close();
console.log(
	`Wrote ${summaries.length} feature summaries and ${results.length} sub-feature outcomes to ${path.join(runDir, "results.md")}`,
);
