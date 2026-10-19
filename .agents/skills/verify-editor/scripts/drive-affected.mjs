import { copyFileSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import { API, capture, db, HANDLE, STATE, WEB } from "./local.mjs";

const runDir = path.resolve(process.argv[2] || "");
if (!process.argv[2])
	throw new Error(
		"Usage: node drive-affected.mjs artifacts/verify-editor/<RUN_ID>",
	);
const fixtureDir = path.join(runDir, "fixtures");
mkdirSync(fixtureDir, { recursive: true });
const image = path.join(fixtureDir, "feature-map-fixture.webp");
const image2 = path.join(fixtureDir, "feature-map-replacement.png");
copyFileSync(
	"apps/web/public/images/landing/hero-profile-preview-6c812da2.webp",
	image,
);
copyFileSync("apps/web/public/images/kofi-support.png", image2);
const pageId = db(`select id from pages where handle='${HANDLE}'`);
const userId = db(
	"select id from \"user\" where email='featuremap@example.com'",
);
if (
	!pageId ||
	db(
		"select product_id||':'||status from creem_subscription where reference_id='" +
			userId +
			"' limit 1",
	) !== "local-pro:active"
)
	throw new Error("Expected isolated Pro owner fixture.");

const results = [];
const networks = [];
function add(feature, subfeature, pass, evidence) {
	results.push({
		feature,
		subfeature,
		status: pass ? "PASS" : "FAIL",
		evidence,
	});
}
async function proof(page, feature, label) {
	await capture(page, path.join(runDir, feature), label);
}
async function waitDb(query, test, ms) {
	const end = Date.now() + (ms || 15000);
	while (Date.now() < end) {
		const value = db(query);
		if (test(value)) return value;
		await new Promise((resolve) => setTimeout(resolve, 250));
	}
	return db(query);
}
async function saved(page) {
	await page.waitForTimeout(1600);
}
async function reload(page) {
	await page.reload({ waitUntil: "domcontentloaded", timeout: 25000 });
	await page.waitForTimeout(2200);
}
function hasOwnedImage(data) {
	try {
		return typeof JSON.parse(data).imageKey === "string";
	} catch {
		return false;
	}
}
function ownedImageKey(data) {
	try {
		return JSON.parse(data).imageKey || "";
	} catch {
		return "";
	}
}
async function ownedImageStatus(data) {
	const key = ownedImageKey(data);
	return key
		? context.request
				.get(`${API}/media/${key}`)
				.then((r) => r.status())
				.catch(() => 0)
		: 0;
}
function card(id) {
	return page.locator(`[data-bento-item-id="${id}"]`);
}
async function remove(id) {
	const item = card(id);
	if (await item.count()) {
		await item.scrollIntoViewIfNeeded({ timeout: 10000 });
		await item.hover({ force: true });
		await item.getByRole("button", { name: "Delete item" }).click();
	}
	return (
		(await waitDb(
			`select count(*) from page_items where id='${id}'`,
			(v) => v === "0",
			15000,
		)) === "0"
	);
}

const browser = await chromium.launch({
	headless: false,
	executablePath:
		process.env.CHROME_PATH ||
		"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
});
const context = await browser.newContext({
	storageState: STATE,
	viewport: { width: 1365, height: 900 },
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
	const u = new URL(route.request().url());
	networks.push(`${route.request().method()} ${u.hostname}${u.pathname}`);
	if (u.pathname.includes("/search/geocode/v6/forward")) {
		await route.fulfill({
			contentType: "application/json",
			body: JSON.stringify({
				features: [
					{
						id: "local-place-1",
						geometry: { type: "Point", coordinates: [-122.4194, 37.7749] },
						properties: {
							mapbox_id: "local-place-1",
							name: "Local Test Place",
							place_formatted: "San Francisco, CA",
						},
					},
				],
			}),
		});
	} else if (u.pathname.includes("/styles/v1/")) {
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
		await route.fulfill({ status: 204, body: "" });
	}
});
await context.route("https://events.mapbox.com/**", (route) =>
	route.fulfill({ status: 204, body: "" }),
);
await context.route("http://127.0.0.1:3001/media/**", async (route) => {
	if (route.request().method() === "OPTIONS") {
		const requestedHeaders =
			route.request().headers()["access-control-request-headers"] ??
			"content-type";
		await route.fulfill({
			status: 204,
			headers: {
				"Access-Control-Allow-Origin": WEB,
				"Access-Control-Allow-Credentials": "true",
				"Access-Control-Allow-Methods": "PUT, OPTIONS",
				"Access-Control-Allow-Headers": requestedHeaders,
			},
		});
		networks.push(
			`OPTIONS local-media 204 preflight headers=${requestedHeaders}`,
		);
		return;
	}
	try {
		const response = await route.fetch({ timeout: 20000 });
		networks.push(
			`${route.request().method()} local-media ${response.status()}`,
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
		networks.push(
			"local-media route failure: " +
				String(error)
					.replace(/https?:\/\/[^\s"']+/g, "[local-url]")
					.slice(0, 240),
		);
		await route.abort("failed").catch(() => {});
	}
});
const page = await context.newPage();
page.setDefaultTimeout(12000);
page.on("response", (response) => {
	try {
		const u = new URL(response.url());
		if (u.origin === API) {
			networks.push(
				response.request().method() +
					" " +
					u.pathname +
					" " +
					response.status(),
			);
			if (
				u.pathname.endsWith("/items/upload") &&
				!u.pathname.endsWith("/complete") &&
				response.request().method() === "POST"
			) {
				void response
					.json()
					.then((body) => {
						try {
							const uploadUrl = new URL(body.uploadUrl);
							networks.push(
								"upload URL " +
									uploadUrl.origin +
									uploadUrl.pathname +
									" query-present=" +
									Boolean(uploadUrl.search),
							);
						} catch {
							networks.push("upload URL invalid");
						}
					})
					.catch(() => {});
			}
		}
	} catch {}
});
page.on("requestfailed", (request) => {
	try {
		const u = new URL(request.url());
		networks.push(
			"request failed " +
				request.method() +
				" " +
				u.origin +
				u.pathname +
				" " +
				(request.failure()?.errorText || "unknown"),
		);
	} catch {}
});
page.on("console", (message) => {
	if (message.type() === "error")
		networks.push("browser console error observed");
});
await page.goto(`${WEB}/${HANDLE}`, {
	waitUntil: "domcontentloaded",
	timeout: 25000,
});
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
await proof(page, "targeted-owner-baseline", "owner-page");
const startIds = db(
	"select coalesce(string_agg(id,','),'') from page_items where page_id='" +
		pageId +
		"'",
);

// Media upload and editing.
let mediaId = "";
let cancelId = "";
try {
	await page.getByRole("button", { name: "Add media", exact: true }).click();
	const mediaInput = page.locator(
		'input[type="file"][accept="image/*,video/*"]',
	);
	await mediaInput.setInputFiles(image);
	mediaId = await waitDb(
		"select id from page_items where page_id='" +
			pageId +
			"' and type='media' order by created_at desc limit 1",
		Boolean,
		20000,
	);
	const data = JSON.parse(
		db(`select data::text from page_items where id='${mediaId}'`) || "{}",
	);
	const objectKey = data.objectKey || "";
	const getStatus = objectKey
		? await context.request
				.get(`${API}/media/${objectKey}`)
				.then((r) => r.status())
				.catch(() => 0)
		: 0;
	add(
		"editor-media-upload",
		"media-add",
		!!mediaId,
		"Visible Add media chooser selected local fixture; saved media row=" +
			(mediaId || "missing") +
			".",
	);
	add(
		"editor-media-upload",
		"media-upload",
		!!mediaId && !!objectKey && getStatus === 200,
		"Isolated row contains object key=" +
			!!objectKey +
			"; local media GET=" +
			getStatus +
			"; observed=" +
			networks.filter((n) => n.includes("media")).join(",") +
			".",
	);
	await proof(page, "editor-media-upload", "media-uploaded");
	await reload(page);
	const mediaPersisted =
		!!mediaId &&
		db(`select id from page_items where id='${mediaId}' and type='media'`) ===
			mediaId;
	add(
		"editor-media-upload",
		"media-upload-persist",
		mediaPersisted,
		`Reload retained media row ${mediaId || "missing"}.`,
	);
	const m = card(mediaId);
	await m
		.getByRole("textbox", { name: "Media caption" })
		.fill("Feature map media caption");
	await saved(page);
	let row = db(`select data::text from page_items where id='${mediaId}'`);
	add(
		"editor-media-editing",
		"media-caption",
		row.includes("Feature map media caption"),
		`Visible caption field saved; row=${row.slice(0, 180)}.`,
	);
	await m.hover();
	await m.getByRole("button", { name: "Crop media" }).click();
	await m
		.locator('[data-bento-item-crop-open="true"]')
		.waitFor({ state: "visible" });
	const drag = await m
		.getByRole("button", { name: "Drag media to crop" })
		.boundingBox();
	if (drag) {
		await page.mouse.move(drag.x + drag.width / 2, drag.y + drag.height / 2);
		await page.mouse.down();
		await page.mouse.move(
			drag.x + drag.width / 2 + 24,
			drag.y + drag.height / 2 + 16,
			{ steps: 8 },
		);
		await page.mouse.up();
	}
	await m.getByRole("button", { name: "Apply media crop" }).click();
	await saved(page);
	const cropRow = db(`select data::text from page_items where id='${mediaId}'`);
	add(
		"editor-media-editing",
		"media-crop",
		cropRow !== row,
		`Crop controls applied; saved row changed=${cropRow !== row}.`,
	);
	await reload(page);
	row = db(`select data::text from page_items where id='${mediaId}'`);
	add(
		"editor-media-editing",
		"media-edit-persist",
		row === cropRow && row.includes("Feature map media caption"),
		`Reload retained caption and crop row=${row.slice(0, 180)}.`,
	);
	await proof(page, "editor-media-editing", "media-edited");
} catch (e) {
	for (const [f, s] of [
		["editor-media-upload", "media-add"],
		["editor-media-upload", "media-upload"],
		["editor-media-upload", "media-upload-persist"],
		["editor-media-editing", "media-caption"],
		["editor-media-editing", "media-crop"],
		["editor-media-editing", "media-edit-persist"],
	])
		if (!results.some((r) => r.feature === f && r.subfeature === s))
			add(f, s, false, `실행 실패: ${String(e).slice(0, 300)}`);
}
try {
	let release;
	const held = new Promise((resolve) => {
		release = resolve;
	});
	let intercepted = false;
	await page.route("http://127.0.0.1:3001/media/**", async (route) => {
		if (route.request().method() !== "PUT") return route.continue();
		intercepted = true;
		await held;
		await route.abort("aborted").catch(() => {});
	});
	await page.getByRole("button", { name: "Add media", exact: true }).click();
	await page
		.locator('input[type="file"][accept="image/*,video/*"]')
		.setInputFiles(image2);
	await page
		.waitForFunction(
			() =>
				[...document.querySelectorAll("[data-bento-item-id]")].some((n) =>
					n.querySelector('img[src^="blob:"]'),
				),
			{ timeout: 10000 },
		)
		.catch(() => {});
	cancelId = await waitDb(
		"select id from page_items where page_id='" +
			pageId +
			"' and type='media' order by created_at desc limit 1",
		Boolean,
		10000,
	);
	const pdata = JSON.parse(
		db(`select data::text from page_items where id='${cancelId}'`) || "{}",
	);
	const key = pdata.objectKey || "";
	await card(cancelId).hover();
	await card(cancelId).getByRole("button", { name: "Delete item" }).click();
	release();
	await page.unroute("http://127.0.0.1:3001/media/**");
	const gone =
		(await waitDb(
			`select count(*) from page_items where id='${cancelId}'`,
			(v) => v === "0",
			15000,
		)) === "0";
	const assetState = key
		? await waitDb(
				"select status||':'||(delete_after > now())::text from page_media_assets where object_key='" +
					key +
					"'",
				(v) => v === "pending_delete:true",
				15000,
			)
		: "";
	const objectStatus = key
		? await context.request
				.get(`${API}/media/${key}`)
				.then((r) => r.status())
				.catch(() => 0)
		: 404;
	add(
		"editor-media-upload",
		"media-cancel",
		intercepted && gone && assetState === "pending_delete:true",
		"Pending PUT intercepted=" +
			intercepted +
			"; row removed=" +
			gone +
			"; page media asset=" +
			(assetState || "missing") +
			"; deleteAfter is future; local object GET=" +
			objectStatus +
			" (retained during cleanup grace period).",
	);
	await proof(page, "editor-media-upload", "media-cancelled");
} catch (e) {
	add(
		"editor-media-upload",
		"media-cancel",
		false,
		`실행 실패: ${String(e).slice(0, 300)}`,
	);
}

// Map card and fake geocoding result.
let mapId = "";
try {
	await page.getByRole("button", { name: "Add map" }).click();
	mapId = await waitDb(
		"select id from page_items where page_id='" +
			pageId +
			"' and type='map' order by created_at desc limit 1",
		Boolean,
		12000,
	);
	add(
		"editor-map-editing",
		"map-add",
		!!mapId,
		`Clicked Add map; saved row=${mapId || "missing"}.`,
	);
	const m = card(mapId);
	await m.scrollIntoViewIfNeeded();
	await m.hover();
	const before = db(`select data::text from page_items where id='${mapId}'`);
	const searchButton = m.getByRole("button", { name: "Search location" });
	const searchEnabled = await searchButton.isEnabled().catch(() => false);
	await proof(page, "editor-map-editing", "map-search-control");
	let selected = before;
	if (searchEnabled) {
		await searchButton.click();
		const search = page.getByRole("combobox", { name: "Search location" });
		await search.waitFor({ state: "visible", timeout: 10000 });
		await search.fill("San Francisco");
		const option = page.getByRole("option", { name: /Local Test Place/ });
		await option.waitFor({ state: "visible", timeout: 10000 });
		await option.click();
		await saved(page);
		selected = db(`select data::text from page_items where id='${mapId}'`);
		add(
			"editor-map-editing",
			"map-search",
			selected !== before && selected.includes("37.7749"),
			"Fake Mapbox result selected; geocode response was browser-mocked; row changed=" +
				(selected !== before) +
				"; data=" +
				selected.slice(0, 180) +
				".",
		);
	} else {
		add(
			"editor-map-editing",
			"map-search",
			false,
			"환경 차단: local Mapbox search control is disabled; no geocode request was sent. Browser mock route remained active; request observations=" +
				networks.filter((n) => n.includes("geocode")).join(",") +
				".",
		);
	}
	await proof(page, "editor-map-editing", "map-search-result");
} catch (e) {
	for (const s of ["map-add", "map-search"])
		if (
			!results.some(
				(r) => r.feature === "editor-map-editing" && r.subfeature === s,
			)
		)
			add(
				"editor-map-editing",
				s,
				false,
				`실행 실패: ${String(e).slice(0, 300)}`,
			);
}

// Create a link through the toolbar and exercise metadata, image, and text destination.
let linkId = "";
try {
	await page.getByRole("button", { name: "Add link" }).click();
	const input = page.getByRole("textbox", { name: "Link URL" }).last();
	await input.fill("https://example.com/featuremap-metadata");
	await input.press("Enter");
	linkId = await waitDb(
		"select id from page_items where page_id='" +
			pageId +
			"' and type='link' and data::text like '%featuremap-metadata%' order by created_at desc limit 1",
		Boolean,
		15000,
	);
	add(
		"editor-link-metadata",
		"link-add",
		!!linkId,
		"Entered public example URL through Add link; saved row=" +
			(linkId || "missing") +
			".",
	);
	const l = card(linkId);
	await l.scrollIntoViewIfNeeded();
	await l.hover();
	await l.getByRole("button", { name: "Full square" }).click();
	await l.hover();
	await l.getByRole("button", { name: "Edit link URL" }).click();
	const refreshButton = page.getByRole("button", {
		name: "Refresh link metadata",
	});
	const refreshResponsePromise = page
		.waitForResponse(
			(r) => r.url().includes("metadata") && r.request().method() === "POST",
			{ timeout: 10000 },
		)
		.catch(() => null);
	await refreshButton.click();
	const refreshResponse = await refreshResponsePromise;
	await page.waitForTimeout(1200);
	let linkData = db(`select data::text from page_items where id='${linkId}'`);
	add(
		"editor-link-metadata",
		"link-metadata",
		/title|description/i.test(linkData),
		"After refresh metadata keys present=" +
			/title|description/i.test(linkData) +
			"; row=" +
			linkData.slice(0, 180) +
			".",
	);
	add(
		"editor-link-metadata",
		"link-metadata-refresh",
		!!refreshResponse && refreshResponse.status() < 400,
		"Refresh response=" +
			(refreshResponse ? refreshResponse.status() : "not observed") +
			".",
	);
	await reload(page);
	linkData = db(`select data::text from page_items where id='${linkId}'`);
	add(
		"editor-link-metadata",
		"link-persist",
		linkData.includes("featuremap-metadata") &&
			/title|description/i.test(linkData),
		"Reload retained URL and metadata=" +
			/title|description/i.test(linkData) +
			".",
	);
	await proof(page, "editor-link-metadata", "link-persisted");

	await l.hover();
	let chooser = page
		.waitForEvent("filechooser", { timeout: 5000 })
		.catch(() => null);
	await l.getByRole("button", { name: "Replace link image" }).click();
	const addChooser = await chooser;
	if (addChooser) await addChooser.setFiles(image);
	else
		await l
			.locator('input[type="file"][accept="image/*"]')
			.setInputFiles(image);
	let imgData = await waitDb(
		`select data::text from page_items where id='${linkId}'`,
		hasOwnedImage,
		20000,
	);
	const addImageGet = await ownedImageStatus(imgData);
	add(
		"editor-link-card-images",
		"link-image-add",
		hasOwnedImage(imgData) && addImageGet === 200,
		"Local file chooser uploaded image; owned imageKey saved=" +
			hasOwnedImage(imgData) +
			"; local object GET=" +
			addImageGet +
			".",
	);
	await l.hover();
	chooser = page
		.waitForEvent("filechooser", { timeout: 5000 })
		.catch(() => null);
	await l.getByRole("button", { name: "Replace link image" }).click();
	const replaceChooser = await chooser;
	if (replaceChooser) await replaceChooser.setFiles(image2);
	else
		await l
			.locator('input[type="file"][accept="image/*"]')
			.setInputFiles(image2);
	const replaceData = await waitDb(
		`select data::text from page_items where id='${linkId}'`,
		(v) => v !== imgData && hasOwnedImage(v),
		20000,
	);
	const replaceImageGet = await ownedImageStatus(replaceData);
	add(
		"editor-link-card-images",
		"link-image-replace",
		replaceData !== imgData &&
			hasOwnedImage(replaceData) &&
			replaceImageGet === 200,
		"Replacement upload changed link row and retained owned imageKey=" +
			(replaceData !== imgData && hasOwnedImage(replaceData)) +
			"; local object GET=" +
			replaceImageGet +
			".",
	);
	await reload(page);
	imgData = db(`select data::text from page_items where id='${linkId}'`);
	const persistedImageGet = await ownedImageStatus(imgData);
	add(
		"editor-link-card-images",
		"link-image-persist",
		hasOwnedImage(imgData) && persistedImageGet === 200,
		"Reload retained owned image key=" +
			hasOwnedImage(imgData) +
			"; local object GET=" +
			persistedImageGet +
			".",
	);
	const hadImageKey = hasOwnedImage(imgData);
	await l.hover();
	await l.getByRole("button", { name: "Remove link image" }).click();
	const cleared = await waitDb(
		`select data::text from page_items where id='${linkId}'`,
		(v) => !hasOwnedImage(v),
		15000,
	);
	add(
		"editor-link-card-images",
		"link-image-remove",
		hadImageKey && !hasOwnedImage(cleared),
		"Image key existed before removal=" +
			hadImageKey +
			"; cleared after click=" +
			!hasOwnedImage(cleared) +
			".",
	);
	await proof(page, "editor-link-card-images", "link-image-removed");
} catch (e) {
	for (const [f, s] of [
		["editor-link-metadata", "link-add"],
		["editor-link-metadata", "link-metadata"],
		["editor-link-metadata", "link-metadata-refresh"],
		["editor-link-metadata", "link-persist"],
		["editor-link-card-images", "link-image-add"],
		["editor-link-card-images", "link-image-replace"],
		["editor-link-card-images", "link-image-remove"],
		["editor-link-card-images", "link-image-persist"],
	])
		if (!results.some((r) => r.feature === f && r.subfeature === s))
			add(f, s, false, `실행 실패: ${String(e).slice(0, 300)}`);
}

// Optional destination on text with edit, validation, reload, and clear.
let textId = "";
try {
	await page.getByRole("button", { name: "Add text" }).click();
	const text = page.locator('textarea[aria-label="Text content"]').last();
	await text.fill("Feature map destination text");
	await text.press("Tab");
	textId = await waitDb(
		"select id from page_items where page_id='" +
			pageId +
			"' and type='text' and data::text like '%Feature map destination text%' order by created_at desc limit 1",
		Boolean,
		12000,
	);
	const t = card(textId);
	await t.scrollIntoViewIfNeeded();
	await t.hover();
	await t.getByRole("button", { name: "Open text style options" }).click();
	await page.getByRole("button", { name: "Add text link" }).click();
	let dest = page.getByRole("textbox", { name: "Link URL" }).last();
	await dest.fill("https://example.com/featuremap-text");
	await dest.press("Enter");
	await saved(page);
	let textData = db(`select data::text from page_items where id='${textId}'`);
	add(
		"editor-inline-destination-url",
		"text-destination-add",
		textData.includes("featuremap-text"),
		`Add text link saved URL=${textData.includes("featuremap-text")}.`,
	);
	await dest.press("Escape").catch(() => {});
	if (
		(await t
			.getByRole("button", { name: "Open text style options" })
			.getAttribute("aria-expanded")) !== "true"
	)
		await t.getByRole("button", { name: "Open text style options" }).click();
	await page.getByRole("button", { name: "Edit text link" }).click();
	dest = page.getByRole("textbox", { name: "Link URL" }).last();
	await dest.fill("https://example.com/featuremap-updated");
	await dest.press("Enter");
	await saved(page);
	textData = db(`select data::text from page_items where id='${textId}'`);
	add(
		"editor-inline-destination-url",
		"destination-edit",
		textData.includes("featuremap-updated"),
		`Edited destination saved=${textData.includes("featuremap-updated")}.`,
	);
	await dest.press("Escape").catch(() => {});
	if (
		(await t
			.getByRole("button", { name: "Open text style options" })
			.getAttribute("aria-expanded")) !== "true"
	)
		await t.getByRole("button", { name: "Open text style options" }).click();
	await page.getByRole("button", { name: "Edit text link" }).click();
	dest = page.getByRole("textbox", { name: "Link URL" }).last();
	await dest.fill("not a url");
	await dest.press("Enter");
	await saved(page);
	textData = db(`select data::text from page_items where id='${textId}'`);
	add(
		"editor-inline-destination-url",
		"destination-validation",
		textData.includes("featuremap-updated"),
		"Invalid URL preserved previous valid value=" +
			textData.includes("featuremap-updated") +
			".",
	);
	await reload(page);
	textData = db(`select data::text from page_items where id='${textId}'`);
	add(
		"editor-inline-destination-url",
		"destination-persist",
		textData.includes("featuremap-updated"),
		"Reload retained destination=" +
			textData.includes("featuremap-updated") +
			".",
	);
	await t.hover();
	await t.getByRole("button", { name: "Open text style options" }).click();
	await page.getByRole("button", { name: "Edit text link" }).click();
	dest = page.getByRole("textbox", { name: "Link URL" }).last();
	await dest.fill("");
	await dest.press("Enter");
	await saved(page);
	textData = db(`select data::text from page_items where id='${textId}'`);
	add(
		"editor-inline-destination-url",
		"destination-clear",
		!textData.includes("featuremap-updated"),
		"Clear removed optional target=" +
			!textData.includes("featuremap-updated") +
			".",
	);
	await proof(page, "editor-inline-destination-url", "destination-cleared");
} catch (e) {
	for (const s of [
		"text-destination-add",
		"destination-edit",
		"destination-validation",
		"destination-persist",
		"destination-clear",
	])
		if (
			!results.some(
				(r) =>
					r.feature === "editor-inline-destination-url" && r.subfeature === s,
			)
		)
			add(
				"editor-inline-destination-url",
				s,
				false,
				`실행 실패: ${String(e).slice(0, 300)}`,
			);
}

// Tweet add and unavailable ID rejection.
try {
	await page.getByRole("button", { name: "Advanced" }).click();
	let dialog = page.getByRole("dialog", { name: "Advanced widgets" });
	await dialog.getByRole("textbox", { name: "Search widgets" }).fill("tweet");
	await dialog.getByRole("button", { name: "Tweet", exact: true }).click();
	let tweet = page.getByRole("dialog", { name: "Tweet" });
	add(
		"editor-tweet",
		"tweet-open",
		await tweet.getByRole("textbox", { name: "Tweet ID or URL" }).isVisible(),
		"Tweet dialog opened from Advanced picker.",
	);
	await proof(page, "editor-tweet", "tweet-dialog");
	const before = db(
		"select count(*) from page_items where page_id='" +
			pageId +
			"' and type='tweet'",
	);
	await tweet
		.getByRole("textbox", { name: "Tweet ID or URL" })
		.fill("https://x.com/featuremap/status/1234567890123456789");
	let preview = page
		.waitForResponse(
			(r) =>
				r.url().includes("/widgets/preview") && r.request().method() === "POST",
			{ timeout: 15000 },
		)
		.catch(() => null);
	await tweet.getByRole("button", { name: "Add", exact: true }).click();
	const response = await preview;
	const tweetId = await waitDb(
		"select id from page_items where page_id='" +
			pageId +
			"' and type='tweet' order by created_at desc limit 1",
		Boolean,
		15000,
	);
	add(
		"editor-tweet",
		"tweet-add",
		!!tweetId && response?.status() === 200,
		"Fake preview response=" +
			(response?.status() || "none") +
			"; saved tweet row=" +
			(tweetId || "missing") +
			".",
	);
	await reload(page);
	add(
		"editor-tweet",
		"tweet-persist",
		!!tweetId &&
			db(`select id from page_items where id='${tweetId}'`) === tweetId,
		`Reload retained tweet row=${!!tweetId}.`,
	);
	dialog = page.getByRole("dialog", { name: "Advanced widgets" });
	if (!(await dialog.isVisible().catch(() => false))) {
		await page.getByRole("button", { name: "Advanced" }).click();
		dialog = page.getByRole("dialog", { name: "Advanced widgets" });
	}
	await dialog.getByRole("textbox", { name: "Search widgets" }).fill("tweet");
	await dialog.getByRole("button", { name: "Tweet", exact: true }).click();
	tweet = page.getByRole("dialog", { name: "Tweet" });
	await tweet
		.getByRole("textbox", { name: "Tweet ID or URL" })
		.fill("https://x.com/featuremap/status/0");
	preview = page
		.waitForResponse(
			(r) =>
				r.url().includes("/widgets/preview") && r.request().method() === "POST",
			{ timeout: 15000 },
		)
		.catch(() => null);
	await tweet.getByRole("button", { name: "Add", exact: true }).click();
	const bad = await preview;
	const error = await tweet
		.getByRole("alert")
		.innerText()
		.catch(() => "");
	const after = Number(
		db(
			"select count(*) from page_items where page_id='" +
				pageId +
				"' and type='tweet'",
		),
	);
	add(
		"editor-tweet",
		"tweet-invalid",
		[404, 502].includes(bad?.status()) &&
			error.length > 0 &&
			after === Number(before) + (tweetId ? 1 : 0),
		"Unavailable mock preview upstream rejection surfaced as POST=" +
			(bad?.status() || "none") +
			"; visible error=" +
			error +
			"; no extra row=" +
			(after === Number(before) + (tweetId ? 1 : 0)) +
			".",
	);
	await proof(page, "editor-tweet", "tweet-invalid");
} catch (e) {
	for (const s of ["tweet-open", "tweet-add", "tweet-persist", "tweet-invalid"])
		if (
			!results.some((r) => r.feature === "editor-tweet" && r.subfeature === s)
		)
			add("editor-tweet", s, false, `실행 실패: ${String(e).slice(0, 300)}`);
}

// Restore every row created by this retry through visible owner controls.
for (const id of db(`select id from page_items where page_id='${pageId}'`)
	.split("\n")
	.filter(Boolean)) {
	if (startIds.split(",").includes(id)) continue;
	try {
		await remove(id);
	} catch {}
}
await reload(page);
await proof(page, "targeted-cleanup", "owner-page-restored");
const remaining = db(
	"select count(*) from page_items where page_id='" +
		pageId +
		"' and id not in (" +
		(startIds
			? startIds
					.split(",")
					.map((x) => `'${x}'`)
					.join(",")
			: "''") +
		")",
);
const plan = db(
	"select product_id||':'||status from creem_subscription where reference_id='" +
		userId +
		"' limit 1",
);
const final = {
	handle: db(`select handle from pages where id='${pageId}'`),
	remainingTemporaryRows: remaining,
	plan,
	results,
	network: networks,
};
writeFileSync(
	path.join(runDir, "targeted-results.json"),
	`${JSON.stringify(final, null, 2)}\n`,
);
writeFileSync(
	path.join(runDir, "targeted-results.md"),
	[
		"# Focused retry of editor journeys",
		"",
		"Owner: " +
			HANDLE +
			"; plan readback: " +
			plan +
			"; remaining temporary rows: " +
			remaining,
		"",
		"| Feature / subfeature | Result | Evidence |",
		"| --- | --- | --- |",
		...results.map(
			(r) =>
				"| " +
				r.feature +
				" / " +
				r.subfeature +
				" | " +
				r.status +
				" | " +
				r.evidence.replaceAll("|", "/") +
				" |",
		),
		"",
		`Network observations: ${networks.join("; ")}`,
	].join("\n"),
);
await context.close();
await browser.close();
console.log(
	"Wrote " +
		results.length +
		" targeted subfeature outcomes to " +
		path.join(runDir, "targeted-results.md"),
);
