// Drive owner-editor journeys on the real signed-in editor (not /demo) and write evidence per journey.
// Usage (from $PW_DIR so `playwright` resolves):
//   RUN_DIR=<scratch dir> [WEB_URL=http://127.0.0.1:3000 SERVER_URL=http://127.0.0.1:3001] \
//   node $SKILL/scripts/drive-editor-journeys.mjs "$EVIDENCE_DIR" [media-upload,media-cancel,link-refresh,item-add]
// Signs in as featuremap@example.com (OTP from local DB). Needs the shared featuremap-test page.

import { execFileSync } from "node:child_process";
import { appendFileSync, mkdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { requireEvidenceDir } from "./evidence-path.mjs";

const SCRIPTS = dirname(fileURLToPath(import.meta.url));
const EMAIL = "featuremap@example.com";
const WEB = process.env.WEB_URL || "http://127.0.0.1:3000";
async function login(b) {
	const ctx = await b.newContext({
		viewport: { width: 1280, height: 900 },
		reducedMotion: "reduce",
	});
	const p = await ctx.newPage();
	await p.goto(`${WEB}/sign-in`, {
		waitUntil: "networkidle",
		timeout: 240000,
	});
	await p.getByRole("textbox", { name: "Email" }).fill(EMAIL);
	await p.getByRole("button", { name: "Send OTP" }).click();
	await p.getByRole("heading", { name: "Check your inbox" }).waitFor();
	const otp = execFileSync(`${SCRIPTS}/otp.sh`, [EMAIL]).toString().trim();
	await p.getByRole("textbox").first().fill(otp);
	await p.getByRole("button", { name: "Verify code" }).click();
	await p.waitForURL((u) => !u.pathname.startsWith("/sign-in"), {
		timeout: 240000,
	});
	await p.waitForLoadState("networkidle", { timeout: 240000 });
	if (process.env.FEATURE_MAP_AUTH_STATE)
		await ctx.storageState({ path: process.env.FEATURE_MAP_AUTH_STATE });
	return { b, ctx, p };
}
const evidenceArgument = process.argv[2];
const EV = evidenceArgument ? requireEvidenceDir(evidenceArgument) : undefined;
const only = (process.argv[3] || "").split(",").filter(Boolean);
const RUN_DIR = process.env.RUN_DIR;
if (!EV || !RUN_DIR) {
	console.error(
		"usage: RUN_DIR=... node drive-editor-journeys.mjs <evidence-dir> [ids]",
	);
	process.exit(2);
}
const { chromium } = createRequire(`${process.cwd()}/`)("playwright");
const sql = (q) =>
	execFileSync("docker", [
		"exec",
		"grabbin-featuremap-postgres",
		"psql",
		"-U",
		"postgres",
		"-tAc",
		q,
	])
		.toString()
		.trim();
const [PAGE, HANDLE] = sql(
	`select p.id || '|' || p.handle from "user" u join pages p on p.user_id = u.id where u.email = '${EMAIL}' order by p.created_at limit 1`,
).split("|");
if (!PAGE) {
	console.error(
		`no page for ${EMAIL}; sign in and create one via /create first`,
	);
	process.exit(2);
}
const items = () =>
	sql(
		`select coalesce(string_agg(type || ':' || coalesce(data->>'objectKey', data->>'url', left(data::text,40)), ' | ' order by created_at), '') from page_items where page_id='${PAGE}'`,
	);
const itemIds = () =>
	sql(
		`select coalesce(string_agg(id, E'\\n' order by created_at), '') from page_items where page_id='${PAGE}'`,
	)
		.split("\n")
		.filter(Boolean);
const count = (t) =>
	Number(
		sql(
			`select count(*) from page_items where page_id='${PAGE}' and type='${t}'`,
		),
	);
// Local bucket check through the server's local media route (R2_LOCAL_MODE under alchemy dev).
const SERVER = process.env.SERVER_URL || "http://127.0.0.1:3001";
const localObject = async (key) => {
	const r = await fetch(`${SERVER}/media/${key}`);
	return r.ok
		? `EXISTS ${(await r.arrayBuffer()).byteLength} ${r.headers.get("content-type")}`
		: `MISSING ${r.status}`;
};
// 64x64 PNG fixture (153 bytes), written into RUN_DIR.
const FIXTURE = `${RUN_DIR}/fixture-64.png`;
writeFileSync(
	FIXTURE,
	Buffer.from(
		"iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAIAAAAlC+aJAAAAYElEQVR4nO3PAQkAMQDEsHuY8El/GWWQUAP9tnu2lzt7moGagZqBmoGagZqBmoGagZqBmoGagZqBmoGagZqBmoGagZqBmoGagZqBmoGagZqBmoGagZqBmoGagZqBmoHaDyKFA3Z0V193AAAAAElFTkSuQmCC",
		"base64",
	),
);
const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
const authState = process.env.FEATURE_MAP_AUTH_STATE;
let ctx;
let p;
if (authState) {
	ctx = await b.newContext({
		storageState: authState,
		viewport: { width: 1280, height: 900 },
		reducedMotion: "reduce",
	});
	p = await ctx.newPage();
} else {
	({ ctx, p } = await login(b));
}
if (process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN === "feature-map-ci") {
	await ctx.route("https://api.mapbox.com/**", async (route) => {
		const url = new URL(route.request().url());
		if (url.pathname === "/search/geocode/v6/forward") {
			await route.fulfill({
				json: {
					features: [
						{
							id: "mapbox-ci-seoul",
							geometry: { type: "Point", coordinates: [126.978, 37.5665] },
							properties: {
								mapbox_id: "mapbox-ci-seoul",
								name: "Seoul",
								place_formatted: "Seoul, Korea",
							},
						},
					],
				},
			});
			return;
		}
		if (url.pathname.startsWith("/styles/v1/")) {
			await route.fulfill({
				json: {
					version: 8,
					name: "Feature map CI",
					sources: {},
					layers: [{ id: "background", type: "background" }],
				},
			});
			return;
		}
		await route.fulfill({ status: 204 });
	});
}
// Network log of API + R2 requests
let netlog = null;
p.on("requestfinished", async (r) => {
	if (!netlog) return;
	const u = new URL(r.url());
	if (u.port === "3000") return;
	const s = (await r.response())?.status();
	appendFileSync(
		netlog,
		`${r.method()} ${u.host}${u.pathname.slice(0, 120)} -> ${s}\n`,
	);
});
p.on("requestfailed", (r) => {
	if (!netlog) return;
	const u = new URL(r.url());
	appendFileSync(
		netlog,
		`${r.method()} ${u.host}${u.pathname.slice(0, 120)} -> FAILED ${r.failure()?.errorText}\n`,
	);
});
// Uploads must stay local: under `alchemy dev` the presigned URL points at the server worker's
// local S3 endpoint (`/cdn-cgi/local/r2/s3`). Any request to cloud R2 is recorded and fails the run.
const cloudR2 = [];
p.on("request", (r) => {
	if (new URL(r.url()).hostname.endsWith(".r2.cloudflarestorage.com"))
		cloudR2.push(`${r.method()} ${r.url().split("?")[0]}`);
});
let hold = null;
await ctx.route(
	(u) => u.pathname.includes("/cdn-cgi/local/r2/s3/"),
	async (route) => {
		const req = route.request();
		if (req.method() === "PUT" && hold) {
			const key = decodeURIComponent(
				new URL(req.url()).pathname
					.split("/cdn-cgi/local/r2/s3/")[1]
					.split("/")
					.slice(1)
					.join("/"),
			);
			if ((await hold(key)) === "abort") {
				appendFileSync(netlog, `held local PUT aborted ${key}\n`);
				return route.abort();
			}
		}
		return route.continue();
	},
);
const results = [];
async function cleanupNewItems(beforeIds, step) {
	const created = itemIds().filter((itemId) => !beforeIds.has(itemId));
	if (!created.length) return;
	const response = await ctx.request.patch(`${SERVER}/pages/${HANDLE}/batch`, {
		data: { upserts: [], deletes: created },
	});
	if (!response.ok())
		throw new Error(`cleanup request failed: ${response.status()}`);
	await p.reload({ waitUntil: "networkidle" });
	if (itemIds().some((itemId) => !beforeIds.has(itemId)))
		throw new Error("cleanup left new page items behind");
	step(
		`cleanup: removed ${created.length} items; media objects queued for deletion`,
	);
}
async function journey(id, fn) {
	if (only.length && !only.includes(id) && !only.includes("all")) return;
	const cloudR2Count = cloudR2.length;
	const dir = `${EV}/${id}`;
	mkdirSync(dir, { recursive: true });
	const beforeIds = new Set(itemIds());
	const log = [];
	netlog = `${dir}/network.txt`;
	writeFileSync(netlog, "");
	const step = (s) => {
		log.push(s);
		console.log(`[${id}] ${s}`);
	};
	let failure;
	try {
		await p.goto(`${WEB}/${HANDLE}`, {
			waitUntil: "networkidle",
			timeout: 240000,
		});
		step(`db before: ${items() || "(none)"}`);
		await p.screenshot({ path: `${dir}/before.png`, fullPage: true });
		await fn(step, dir);
		if (cloudR2.length > cloudR2Count)
			throw new Error(
				`cloud R2 requests: ${cloudR2.slice(cloudR2Count).join(", ")}`,
			);
		await p.screenshot({ path: `${dir}/after.png`, fullPage: true });
		writeFileSync(
			`${dir}/after.aria.txt`,
			await p.locator("body").ariaSnapshot(),
		);
		step(`db after: ${items() || "(none)"}`);
		step("journey complete");
	} catch (e) {
		failure = e;
		step(`journey failed: ${e.message.split("\n")[0]}`);
		await p
			.screenshot({ path: `${dir}/failure.png`, fullPage: true })
			.catch(() => {});
		writeFileSync(
			`${dir}/failure.aria.txt`,
			await p
				.locator("body")
				.ariaSnapshot()
				.catch(() => ""),
		);
	} finally {
		hold = null;
		try {
			await cleanupNewItems(beforeIds, step);
		} catch (e) {
			step(`cleanup: FAIL ${e.message.split("\n")[0]}`);
			failure ??= e;
		}
		step(
			`RESULT: ${failure ? `FAIL ${failure.message.split("\n")[0]}` : "PASS"}`,
		);
		results.push(`${id}: ${failure ? "FAIL" : "PASS"}`);
		writeFileSync(
			`${dir}/actions.md`,
			`${log.map((l) => `- ${l}`).join("\n")}\n`,
		);
		hold = null;
	}
}
const toolbar = p.getByRole("group", { name: "Page editor toolbar" });
const content = p.getByRole("region", { name: "Page content" });
const until = async (pred, what, ms = 30000) => {
	const t = Date.now();
	while (Date.now() - t < ms) {
		if (pred()) return;
		await new Promise((resolve) => setTimeout(resolve, 100));
	}
	throw new Error(`timeout: ${what}; items=${items()}`);
};
const reloadCheck = async (step, t, n) => {
	await until(() => count(t) === n, `${t} saved as ${n}`);
	await p.reload({ waitUntil: "networkidle" });
	const c = count(t);
	step(`after reload: ${t} rows = ${c}`);
	if (c !== n) throw new Error(`${t} expected ${n}, got ${c}`);
};
const addMedia = async () => {
	const before = count("media");
	const chooser = p.waitForEvent("filechooser");
	await toolbar.getByRole("button", { name: "Add media" }).click();
	await (await chooser).setFiles(FIXTURE);
	await until(() => count("media") > before, "media row");
	return sql(
		`select id from page_items where page_id='${PAGE}' and type='media' order by created_at desc limit 1`,
	);
};
const addLink = async (url) => {
	const before = count("link");
	await toolbar.getByRole("button", { name: "Add link" }).click();
	await p.getByRole("textbox", { name: "Link URL" }).fill(url);
	await p.keyboard.press("Enter");
	await until(() => count("link") > before, "link row");
	return sql(
		`select id from page_items where page_id='${PAGE}' and type='link' order by created_at desc limit 1`,
	);
};

await journey("media-upload", async (step, dir) => {
	const before = count("media");
	const chooser = p.waitForEvent("filechooser");
	await toolbar.getByRole("button", { name: "Add media" }).click();
	await (await chooser).setFiles(FIXTURE);
	step("toolbar Add media → chose fixture-64.png (153 B PNG)");
	await until(() => count("media") > before, "media row");
	const key = sql(
		`select data->>'objectKey' from page_items where page_id='${PAGE}' and type='media' order by created_at desc limit 1`,
	);
	step(`page_items media row: objectKey=${key}`);
	step(
		`page_media_assets: ${sql(`select status from page_media_assets where object_key='${key}'`)}`,
	);
	step(`local bucket object: ${await localObject(key)}`);
	await reloadCheck(step, "media", before + 1);
	const srcs = await p
		.locator("img")
		.evaluateAll((els) => els.map((e) => e.currentSrc || e.src));
	writeFileSync(`${dir}/img-srcs.txt`, srcs.join("\n"));
	const src = srcs.find((x) => x.includes(key.split("/").pop()));
	step(`after reload img src: ${src}`);
	if (!src) throw new Error("uploaded image not rendered after reload");
	if (!(await localObject(key)).startsWith("EXISTS"))
		throw new Error("object missing in local bucket");
	step("no request to *.r2.cloudflarestorage.com");
});

await journey("media-cancel", async (step, dir) => {
	const beforeItems = items();
	let release;
	let heldKey = null;
	hold = (key) => {
		heldKey = key;
		step(`upload PUT held at the network (key ${key})`);
		return new Promise((r) => (release = r));
	};
	const cancelReq = p
		.waitForRequest((r) => /upload\/cancel|\/cancel/.test(r.url()), {
			timeout: 20000,
		})
		.catch(() => null);
	const chooser = p.waitForEvent("filechooser");
	await toolbar.getByRole("button", { name: "Add media" }).click();
	await (await chooser).setFiles(FIXTURE);
	await until(() => heldKey, "upload PUT started", 20000);
	await p.screenshot({ path: `${dir}/uploading.png`, fullPage: true });
	const del = content.getByRole("button", { name: "Delete item" });
	const n = await del.count();
	await del.nth(n - 1).click({ force: true });
	step(`clicked Delete item on the uploading block (${n} of ${n})`);
	const req = await cancelReq;
	release("abort");
	step("released the held PUT as aborted (never reached the local bucket)");
	const cancelResponse = req ? await req.response() : null;
	step(
		`cancel request: ${req ? `${req.method()} ${new URL(req.url()).pathname} -> ${cancelResponse?.status()}` : "none"}`,
	);
	await until(
		() =>
			sql(
				`select status from page_media_assets where object_key='${heldKey}'`,
			) === "pending_delete",
		"cancelled upload marked for deletion",
	);
	step(
		`page_media_assets for key: ${sql(`select status || ' delete_after_set=' || (delete_after is not null) from page_media_assets where object_key='${heldKey}'`) || "(no row)"}`,
	);
	await p.reload({ waitUntil: "networkidle" });
	if (items() !== beforeItems) throw new Error(`items changed: ${items()}`);
	step("no page_items row added (checked after reload)");
	const held = await localObject(heldKey);
	step(`local bucket object for held key: ${held}`);
	if (held.startsWith("EXISTS"))
		throw new Error("orphan object in local bucket");
	step("no request to *.r2.cloudflarestorage.com");
	if (!req) throw new Error("app sent no cancel request");
});

await journey("link-refresh", async (step, dir) => {
	const before = count("link");
	const metadataReady = p.waitForResponse(
		(response) =>
			new URL(response.url()).pathname.endsWith(`/pages/${HANDLE}/metadata`),
		{ timeout: 30_000 },
	);
	await toolbar.getByRole("button", { name: "Add link" }).click();
	await p
		.getByRole("textbox", { name: "Link URL" })
		.fill("https://github.com/microsoft/playwright");
	await p.keyboard.press("Enter");
	step("toolbar Add link → https://github.com/microsoft/playwright + Enter");
	await until(() => count("link") > before, "link row");
	await metadataReady;
	const id = sql(
		`select id from page_items where page_id='${PAGE}' and type='link' order by created_at desc limit 1`,
	);
	// Make the stored title stale so a refresh is observable.
	sql(
		`update page_items set data = jsonb_set(data, '{metadata,title}', '"stale title"') where id='${id}'`,
	);
	step(`set metadata.title='stale title' in local DB for item ${id}`);
	await p.reload({ waitUntil: "networkidle" });
	const card = content.getByRole("textbox", { name: "Link title" }).last();
	step(`UI title before refresh: ${await card.inputValue()}`);
	await card.hover();
	const resp = p
		.waitForResponse(
			(r) => /metadata/.test(r.url()) && r.request().method() !== "OPTIONS",
			{ timeout: 30000 },
		)
		.catch(() => null);
	await content
		.getByRole("button", { name: "Edit link URL" })
		.last()
		.click({ force: true });
	await p
		.getByRole("button", { name: "Refresh link metadata" })
		.waitFor({ timeout: 10000 });
	writeFileSync(
		`${dir}/edit-popover.aria.txt`,
		await p.locator("body").ariaSnapshot(),
	);
	await p.getByRole("button", { name: "Refresh link metadata" }).click();
	step("hover card → Edit link URL → clicked Refresh link metadata");
	const r = await resp;
	if (r) {
		const j = await r.json().catch(() => null);
		writeFileSync(`${dir}/metadata-response.json`, JSON.stringify(j, null, 2));
		step(`response title: ${j?.item?.data?.metadata?.title}`);
	}
	step(
		`request: ${r ? `${r.request().method()} ${new URL(r.url()).pathname}${new URL(r.url()).search.slice(0, 80)} -> ${r.status()}` : "none"}`,
	);
	await until(
		() =>
			!sql(
				`select data->'metadata'->>'title' from page_items where id='${id}'`,
			).includes("stale"),
		"title refreshed in DB",
		20000,
	);
	step(
		`DB title after refresh: ${sql(`select data->'metadata'->>'title' from page_items where id='${id}'`)}`,
	);
	if (!r || r.status() >= 300)
		throw new Error("no successful metadata request");
});

await journey("item-add", async (step, dir) => {
	for (const btn of ["Add text", "Add section", "Add link", "Add map"]) {
		const beforeIds = new Set(itemIds());
		await toolbar.getByRole("button", { name: btn }).click();
		if (btn === "Add link") {
			await p
				.getByRole("textbox", { name: "Link URL" })
				.fill("https://example.com/");
			await p.keyboard.press("Enter");
		}
		if (btn === "Add section") {
			await content
				.getByRole("textbox", { name: "Section title" })
				.last()
				.fill("Verify section");
		}
		if (btn === "Add text") {
			await content
				.getByRole("textbox", { name: "Text content" })
				.last()
				.fill("Verify text");
		}
		await until(
			() => itemIds().some((itemId) => !beforeIds.has(itemId)),
			`${btn} saved`,
		);
		writeFileSync(
			`${dir}/${btn.replace(" ", "-")}.aria.txt`,
			await p.locator("body").ariaSnapshot(),
		);
		step(`${btn}: saved ${items()}`);
	}
	await p.reload({ waitUntil: "networkidle" });
	step(`after reload DB: ${items()}`);
	writeFileSync(
		`${dir}/after-reload.aria.txt`,
		await p.locator("body").ariaSnapshot(),
	);
	for (const t of ["text", "section", "map"])
		if (count(t) < 1) throw new Error(`${t} not persisted`);
	// Delete the newest item (the map) via its Delete item control.
	const before = Number(
		sql(`select count(*) from page_items where page_id='${PAGE}'`),
	);
	await content
		.getByRole("link", { name: "Open location in Google Maps" })
		.hover();
	await content.getByRole("button", { name: "Delete item" }).last().click();
	step(
		"hovered the map block → clicked its Delete item (normal click, no force)",
	);
	await until(
		() =>
			Number(sql(`select count(*) from page_items where page_id='${PAGE}'`)) ===
			before - 1,
		"deleted map row",
	);
	await p.reload({ waitUntil: "networkidle" });
	const after = Number(
		sql(`select count(*) from page_items where page_id='${PAGE}'`),
	);
	step(`after reload: page_items ${before} -> ${after}; ${items()}`);
	if (after !== before - 1)
		throw new Error("Delete item did not remove the DB row");
});

await journey("profile-and-handle", async (step) => {
	const before = sql(
		`select coalesce(name, '') || '|' || coalesce(bio, '') from pages where id='${PAGE}'`,
	);
	if (sql(`select image_key from pages where id='${PAGE}'`))
		throw new Error(
			"profile map needs a clean fixture without a profile image",
		);
	const [name, bio] = before.split("|");
	const changeHandle = async (nextHandle) => {
		await p.getByRole("button", { name: "Open page options" }).click();
		await p.getByRole("button", { name: /Change handle/ }).click();
		const form = p.getByRole("dialog", { name: "Change your handle" });
		await form.getByRole("textbox", { name: "Handle" }).fill(nextHandle);
		await form.getByLabel("Handle available").waitFor({ timeout: 30000 });
		await form.getByRole("button", { name: "Change handle" }).click();
		await p.waitForURL(new RegExp(`/${nextHandle}$`), { timeout: 30000 });
	};
	let restoreError;
	try {
		await p.getByRole("textbox", { name: "Name" }).fill("Feature Map CI");
		await p.getByRole("textbox", { name: "Bio" }).fill("Temporary CI profile");
		await until(
			() =>
				sql(`select name || '|' || bio from pages where id='${PAGE}'`) ===
				"Feature Map CI|Temporary CI profile",
			"temporary profile saved",
		);
		await p.reload({ waitUntil: "networkidle" });
		if (
			(await p.getByRole("textbox", { name: "Name" }).inputValue()) !==
			"Feature Map CI"
		)
			throw new Error("profile name did not persist");
		step("profile name and bio saved and survived reload");
		const profileImage = content.getByRole("button", {
			name: "Change profile image",
		});
		const imageChooser = p.waitForEvent("filechooser");
		await profileImage.click();
		await (await imageChooser).setFiles(FIXTURE);
		await until(
			() => Boolean(sql(`select image_key from pages where id='${PAGE}'`)),
			"profile image upload",
		);
		await content.getByRole("button", { name: "Change profile image" }).hover();
		await content.getByRole("button", { name: "Crop profile image" }).click();
		await p.getByRole("button", { name: "Apply profile image crop" }).click();
		await content.getByRole("button", { name: "Change profile image" }).hover();
		await content.getByRole("button", { name: "Remove profile image" }).click();
		await until(
			() => !sql(`select image_key from pages where id='${PAGE}'`),
			"profile image removal",
		);
		step("uploaded, applied a crop, and removed the profile image");
		const temporaryHandle = `featuremap-ci-${Date.now().toString().slice(-6)}`;
		await changeHandle(temporaryHandle);
		if (sql(`select handle from pages where id='${PAGE}'`) !== temporaryHandle)
			throw new Error("page handle change did not persist");
		await changeHandle(HANDLE);
		if (sql(`select handle from pages where id='${PAGE}'`) !== HANDLE)
			throw new Error("feature-map handle was not restored");
		step(
			"changed the handle through page options, then restored featuremap-test",
		);
	} finally {
		const currentHandle = sql(`select handle from pages where id='${PAGE}'`);
		await p.goto(`${WEB}/${currentHandle}`, { waitUntil: "networkidle" });
		if (currentHandle !== HANDLE) await changeHandle(HANDLE);
		if (sql(`select image_key from pages where id='${PAGE}'`)) {
			await content
				.getByRole("button", { name: "Change profile image" })
				.hover();
			await content
				.getByRole("button", { name: "Remove profile image" })
				.click();
			await until(
				() => !sql(`select image_key from pages where id='${PAGE}'`),
				"profile image cleanup",
			);
		}
		await p.goto(`${WEB}/${HANDLE}`, { waitUntil: "networkidle" });
		await p.getByRole("textbox", { name: "Name" }).fill(name);
		await p.getByRole("textbox", { name: "Bio" }).fill(bio);
		await until(
			() =>
				sql(
					`select coalesce(name, '') || '|' || coalesce(bio, '') from pages where id='${PAGE}'`,
				) === before,
			"original profile restored",
		);
		if (
			sql(
				`select coalesce(name, '') || '|' || coalesce(bio, '') from pages where id='${PAGE}'`,
			) !== before
		)
			restoreError = new Error("profile fixture was not restored");
		else step("restored original name, bio, profile image, and handle");
	}
	if (restoreError) throw restoreError;
});

await journey("layout", async (step) => {
	const textId = await (async () => {
		const before = count("text");
		await toolbar.getByRole("button", { name: "Add text" }).click();
		await until(() => count("text") > before, "text row");
		return sql(
			`select id from page_items where page_id='${PAGE}' and type='text' order by created_at desc limit 1`,
		);
	})();
	await toolbar.getByRole("button", { name: "Edit compact layout" }).click();
	await toolbar.getByRole("button", { name: "Edit wide layout" }).click();
	step("switched between compact and wide layouts");
	const shell = content.locator(`[data-bento-item-id="${textId}"]`);
	const beforeLayouts = sql(
		`select layouts::text from page_items where id='${textId}'`,
	);
	await shell.hover();
	await shell.getByRole("button", { name: "Wide" }).click();
	await until(
		() =>
			sql(`select layouts::text from page_items where id='${textId}'`) !==
			beforeLayouts,
		"wide item layout saved",
	);
	await p.reload({ waitUntil: "networkidle" });
	const layouts = sql(
		`select layouts::text from page_items where id='${textId}'`,
	);
	step(`saved layouts: ${layouts}`);
	if (!layouts || layouts === beforeLayouts)
		throw new Error("item size preset did not change its saved layout");
});

await journey("text-formatting", async (step) => {
	const before = count("text");
	await toolbar.getByRole("button", { name: "Add text" }).click();
	await until(() => count("text") > before, "text row");
	const id = sql(
		`select id from page_items where page_id='${PAGE}' and type='text' order by created_at desc limit 1`,
	);
	const textbox = content.getByRole("textbox", { name: "Text content" }).last();
	await textbox.fill("Feature map formatting");
	const shell = content.locator(`[data-bento-item-id="${id}"]`);
	await shell.hover();
	await shell.getByRole("button", { name: "Open text style options" }).click();
	await p.getByRole("button", { name: "Align text center" }).click();
	await p.getByRole("button", { name: "Align text to the bottom" }).click();
	await p
		.getByRole("button", { name: "Toggle text background color options" })
		.click();
	await p.getByRole("radio", { name: "Blue" }).click();
	await p
		.getByRole("textbox", { name: "Text background hex color" })
		.fill("#123abc");
	await p.keyboard.press("Enter");
	await until(() => {
		const row = sql(
			`select data::text || '|' || style::text from page_items where id='${id}'`,
		);
		return ["Feature map formatting", "center", "bottom", "#123abc"].every(
			(value) => row.includes(value),
		);
	}, "text formatting saved");
	await p.reload({ waitUntil: "networkidle" });
	const row = sql(
		`select data::text || '|' || style::text from page_items where id='${id}'`,
	);
	step(`saved formatted text: ${row}`);
	for (const value of ["Feature map formatting", "center", "bottom", "#123abc"])
		if (!row.includes(value))
			throw new Error(`text formatting missing ${value}`);
});

await journey("media-editing", async (step) => {
	const id = await addMedia();
	const shell = content.locator(`[data-bento-item-id="${id}"]`);
	await shell
		.getByRole("textbox", { name: "Media caption" })
		.fill("Feature map media");
	await shell.hover();
	await shell.getByRole("button", { name: "Crop media" }).click();
	const cropHandle = shell.getByRole("button", { name: "Drag media to crop" });
	const cropBox = await cropHandle.boundingBox();
	if (!cropBox) throw new Error("media crop control has no visible bounds");
	await p.mouse.move(
		cropBox.x + cropBox.width / 2,
		cropBox.y + cropBox.height / 2,
	);
	await p.mouse.down();
	await p.mouse.move(
		cropBox.x + cropBox.width / 2 + 24,
		cropBox.y + cropBox.height / 2 + 16,
		{ steps: 4 },
	);
	await p.mouse.up();
	await shell.getByRole("button", { name: "Apply media crop" }).click();
	await until(
		() =>
			sql(`select data::text from page_items where id='${id}'`).includes(
				"crop",
			),
		"media crop saved",
	);
	await shell.hover();
	await shell.getByRole("button", { name: "Add media link" }).click();
	await p
		.getByRole("textbox", { name: "Link URL" })
		.fill("https://example.com/featuremap-media");
	await p.keyboard.press("Enter");
	await until(() => {
		const data = sql(`select data::text from page_items where id='${id}'`);
		return (
			data.includes("Feature map media") &&
			data.includes("https://example.com/featuremap-media")
		);
	}, "media caption and destination saved");
	await p.reload({ waitUntil: "networkidle" });
	const data = sql(`select data::text from page_items where id='${id}'`);
	step(`saved media edits: ${data}`);
	for (const value of [
		"Feature map media",
		"https://example.com/featuremap-media",
		"crop",
	])
		if (!data.includes(value)) throw new Error(`media edit missing ${value}`);
});

await journey("map-editing", async (step) => {
	const before = count("map");
	await toolbar.getByRole("button", { name: "Add map" }).click();
	await until(() => count("map") > before, "map row");
	const id = sql(
		`select id from page_items where page_id='${PAGE}' and type='map' order by created_at desc limit 1`,
	);
	const shell = content.locator(`[data-bento-item-id="${id}"]`);
	await shell
		.getByRole("textbox", { name: "Media caption" })
		.fill("Feature map location");
	await shell.hover();
	await shell.getByRole("button", { name: "Search location" }).click();
	const search = p.getByRole("combobox", { name: "Search location" });
	if (await search.count()) {
		await search.fill("Seoul");
		if (process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN) {
			const list = p.getByRole("listbox", { name: "Location results" });
			await list.waitFor();
			await list.getByRole("option").first().click();
			await p.getByRole("button", { name: "Open map controls" }).click();
			await p.getByRole("button", { name: "Zoom in" }).click();
			await p.getByRole("button", { name: "Close map controls" }).click();
			step("selected a Mapbox location and changed its zoom");
		} else {
			throw new Error("MAPBOX_ACCESS_TOKEN is required for map search");
		}
	}
	await until(() => {
		const [latitude, longitude, zoom] = sql(
			`select data->>'latitude' || '|' || data->>'longitude' || '|' || data->>'zoom' from page_items where id='${id}'`,
		).split("|");
		return (
			sql(`select data::text from page_items where id='${id}'`).includes(
				"Feature map location",
			) &&
			Number(latitude) === 37.5665 &&
			Number(longitude) === 126.978 &&
			Number(zoom) > 12
		);
	}, "map search, zoom, and caption saved");
	await p.reload({ waitUntil: "networkidle" });
	const data = sql(`select data::text from page_items where id='${id}'`);
	const [latitude, longitude, zoom] = sql(
		`select data->>'latitude' || '|' || data->>'longitude' || '|' || data->>'zoom' from page_items where id='${id}'`,
	).split("|");
	if (
		!data.includes("Feature map location") ||
		Number(latitude) !== 37.5665 ||
		Number(longitude) !== 126.978 ||
		Number(zoom) <= 12
	)
		throw new Error("map search, zoom, or caption did not persist");
	step(`map caption persisted: ${data}`);
});

await journey("link-card-images", async (step) => {
	const id = await addLink("https://github.com/microsoft/playwright");
	const shell = content.locator(`[data-bento-item-id="${id}"]`);
	const upload = async (label, previousKey) => {
		const chooser = p.waitForEvent("filechooser");
		await shell.getByRole("button", { name: label }).click();
		await (await chooser).setFiles(FIXTURE);
		await until(() => {
			const key = sql(
				`select data->>'imageKey' from page_items where id='${id}'`,
			);
			return Boolean(key) && key !== previousKey;
		}, `${label} saved`);
	};
	await shell.hover();
	await upload("Add link image", null);
	const first = sql(
		`select data->>'imageKey' from page_items where id='${id}'`,
	);
	if (!first) throw new Error("link image was not saved");
	await shell.hover();
	await upload("Replace link image", first);
	const replacement = sql(
		`select data->>'imageKey' from page_items where id='${id}'`,
	);
	if (!replacement || replacement === first)
		throw new Error("link image was not replaced");
	await p.reload({ waitUntil: "networkidle" });
	if (
		sql(`select data->>'imageKey' from page_items where id='${id}'`) !==
		replacement
	)
		throw new Error("replaced link image did not persist after reload");
	await shell.hover();
	await shell.getByRole("button", { name: "Remove link image" }).click();
	await until(
		() => !sql(`select data->>'imageKey' from page_items where id='${id}'`),
		"link image removed",
	);
	if (sql(`select data->>'imageKey' from page_items where id='${id}'`))
		throw new Error("link image was not removed");
	step("added, replaced, then removed the link image");
});

await journey("inline-destination-url", async (step) => {
	const textBefore = count("text");
	await toolbar.getByRole("button", { name: "Add text" }).click();
	await until(() => count("text") > textBefore, "text row");
	const textId = sql(
		`select id from page_items where page_id='${PAGE}' and type='text' order by created_at desc limit 1`,
	);
	const textShell = content.locator(`[data-bento-item-id="${textId}"]`);
	await content
		.getByRole("textbox", { name: "Text content" })
		.last()
		.fill("Feature map text destination");
	await textShell.hover();
	await textShell.getByRole("button", { name: "Add text link" }).click();
	await p
		.getByRole("textbox", { name: "Link URL" })
		.fill("https://example.com/featuremap-text");
	await p.keyboard.press("Enter");
	const textAction = textShell.getByRole("link", { name: "Open text link" });
	if (
		(await textAction.getAttribute("href")) !==
		"https://example.com/featuremap-text"
	)
		throw new Error("text destination did not open its saved URL");
	await textShell.getByRole("button", { name: "Edit text link" }).click();
	const textUrl = p.getByRole("textbox", { name: "Link URL" });
	await textUrl.fill("not a url");
	await textUrl.press("Enter");
	if ((await textUrl.getAttribute("aria-invalid")) !== "true")
		throw new Error("invalid text destination was not rejected");
	if (
		!sql(`select data::text from page_items where id='${textId}'`).includes(
			"featuremap-text",
		)
	)
		throw new Error("invalid text destination replaced the saved URL");
	await textUrl.fill("https://example.com/featuremap-text-edited");
	await textUrl.press("Enter");
	const mediaId = await addMedia();
	const mediaShell = content.locator(`[data-bento-item-id="${mediaId}"]`);
	await mediaShell.hover();
	await mediaShell.getByRole("button", { name: "Add media link" }).click();
	await p
		.getByRole("textbox", { name: "Link URL" })
		.fill("https://example.com/featuremap-media");
	await p.keyboard.press("Enter");
	await mediaShell.getByRole("button", { name: "Edit media link" }).click();
	const mediaUrl = p.getByRole("textbox", { name: "Link URL" });
	await mediaUrl.fill("not a url");
	await mediaUrl.press("Enter");
	if ((await mediaUrl.getAttribute("aria-invalid")) !== "true")
		throw new Error("invalid media destination was not rejected");
	if (
		!sql(`select data::text from page_items where id='${mediaId}'`).includes(
			"featuremap-media",
		)
	)
		throw new Error("invalid media destination replaced the saved URL");
	await mediaUrl.fill("https://example.com/featuremap-media-edited");
	await mediaUrl.press("Enter");
	await until(
		() =>
			sql(`select data::text from page_items where id='${textId}'`).includes(
				"featuremap-text-edited",
			) &&
			sql(`select data::text from page_items where id='${mediaId}'`).includes(
				"featuremap-media-edited",
			),
		"edited text and media destinations saved",
	);
	for (const [id, url] of [
		[textId, "featuremap-text-edited"],
		[mediaId, "featuremap-media-edited"],
	]) {
		const data = sql(`select data::text from page_items where id='${id}'`);
		if (!data.includes(url)) throw new Error(`destination URL missing ${url}`);
	}
	await p.reload({ waitUntil: "networkidle" });
	for (const [id, url] of [
		[textId, "https://example.com/featuremap-text-edited"],
		[mediaId, "https://example.com/featuremap-media-edited"],
	]) {
		const shell = content.locator(`[data-bento-item-id="${id}"]`);
		const actionName = id === textId ? "Open text link" : "Open media";
		if (
			(await shell
				.getByRole("link", { name: actionName })
				.getAttribute("href")) !== url
		)
			throw new Error(`destination did not persist after reload: ${url}`);
		await shell
			.getByRole("button", {
				name: id === textId ? "Edit text link" : "Edit media link",
			})
			.click();
		const input = p.getByRole("textbox", { name: "Link URL" });
		await input.fill("");
		await input.press("Enter");
	}
	await until(
		() =>
			![textId, mediaId].some((id) =>
				sql(`select data->>'url' from page_items where id='${id}'`),
			),
		"cleared text and media destinations",
	);
	await p.reload({ waitUntil: "networkidle" });
	for (const [id, actionName] of [
		[textId, "Open text link"],
		[mediaId, "Open media"],
	]) {
		if (
			await content
				.locator(`[data-bento-item-id="${id}"]`)
				.getByRole("link", { name: actionName })
				.count()
		)
			throw new Error(`cleared destination action remains for ${id}`);
		if (sql(`select data->>'url' from page_items where id='${id}'`))
			throw new Error(`cleared destination remains in page_items for ${id}`);
	}
	step(
		"text and media destinations were added, edited, rejected when invalid, persisted, and cleared",
	);
});

await journey("tweet", async (step) => {
	await toolbar.getByRole("button", { name: "Advanced" }).click();
	const catalog = p.getByRole("dialog", { name: "Advanced widgets" });
	await catalog.getByRole("button", { name: "Tweet" }).click();
	const dialog = p.getByRole("dialog", { name: "Tweet" });
	await dialog
		.getByRole("textbox", { name: "Tweet ID or URL" })
		.fill("https://x.com/jack/status/20");
	await dialog.getByRole("button", { name: "Add" }).click();
	await until(() => count("tweet") > 0, "tweet row", 60000);
	step("added the public X post through the widget flow");
	const beforeInvalid = count("tweet");
	await toolbar.getByRole("button", { name: "Advanced" }).click();
	await p
		.getByRole("dialog", { name: "Advanced widgets" })
		.getByRole("button", { name: "Tweet", exact: true })
		.click();
	const retry = p.getByRole("dialog", { name: "Tweet" });
	await retry
		.getByRole("textbox", { name: "Tweet ID or URL" })
		.fill("https://x.com/i/status/1");
	await retry.getByRole("button", { name: "Add" }).click();
	await p
		.getByText("Unable to load this Tweet. Try again.")
		.waitFor({ timeout: 60000 });
	if (count("tweet") !== beforeInvalid)
		throw new Error("invalid Tweet created a row");
	step("invalid Tweet showed a recoverable error and added no row");
});

await journey("advanced-widgets", async (step) => {
	await toolbar.getByRole("button", { name: "Advanced" }).click();
	const catalog = p.getByRole("dialog", { name: "Advanced widgets" });
	for (const name of ["Tweet", "Spotify", "RSS Feed", "Calendly"])
		await catalog.getByRole("button", { name, exact: true }).waitFor();
	await catalog
		.getByRole("textbox", { name: "Search widgets" })
		.fill("no matching widget");
	await p.getByText("No widgets found.").waitFor();
	await catalog.getByRole("textbox", { name: "Search widgets" }).fill("");
	for (const name of ["SoundCloud", "Apple Music", "Signature"]) {
		await catalog.getByRole("button", { name, exact: true }).click();
		await p
			.getByText("Sipping coffee while crafting a polished widget...")
			.waitFor();
		await p.getByRole("button", { name: "Back to widgets" }).click();
	}
	for (const [name, field, value, type] of [
		[
			"Spotify",
			"Spotify URL",
			"https://open.spotify.com/track/4iV5W9uYEdYUVa79Axb7Rh",
			"spotify",
		],
		[
			"RSS Feed",
			"RSS feed URL",
			"https://feeds.bbci.co.uk/news/rss.xml",
			"rss",
		],
	]) {
		const before = count(type);
		await catalog.getByRole("button", { name, exact: true }).click();
		const form = p.getByRole("dialog", { name });
		await form.getByRole("textbox", { name: field }).fill(value);
		await form.getByRole("button", { name: "Add" }).click();
		await until(() => count(type) > before, `${type} widget`, 60000);
		step(`${name} widget added and saved`);
		await p.reload({ waitUntil: "networkidle" });
		await toolbar.getByRole("button", { name: "Advanced" }).click();
	}
	await catalog.getByRole("button", { name: "Calendly", exact: true }).click();
	await p.getByRole("button", { name: "Connect to Calendly" }).waitFor();
	step("Calendly connect flow is shown; OAuth needs a test account");
});

await journey("page-sharing", async (step) => {
	await ctx.grantPermissions(["clipboard-read", "clipboard-write"], {
		origin: WEB,
	});
	await p.getByRole("button", { name: "Share page" }).click();
	await p.getByRole("dialog", { name: "Share your page" }).waitFor();
	await p.getByRole("img", { name: "QR code for your page" }).waitFor();
	await p.getByRole("button", { name: "Copy Link" }).click();
	await p.getByRole("button", { name: "Copied Link" }).waitFor();
	const copied = await p.evaluate(() => navigator.clipboard.readText());
	if (!copied.endsWith(`/${HANDLE}`))
		throw new Error(`unexpected copied URL: ${copied}`);
	step(`QR displayed and clipboard copied ${copied}`);
});

console.log(results.join("\n"));
if (results.some((result) => result.includes(": FAIL"))) process.exitCode = 1;
await b.close();
