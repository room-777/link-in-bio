// Drive owner-editor journeys on the real signed-in editor (not /demo) and write evidence per journey.
// Usage (from $PW_DIR so `playwright` resolves):
//   RUN_DIR=<scratch dir> [WEB_URL=http://localhost:3000 SERVER_URL=http://localhost:3001] \
//   node $SKILL/scripts/drive-editor-journeys.mjs "$EVIDENCE_DIR" [media-upload,media-cancel,link-refresh,item-add]
// Signs in as dev@example.com (OTP from local DB). Needs a page for that user (create via /create).

import { execFileSync } from "node:child_process";
import { appendFileSync, mkdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const { chromium } = createRequire(`${process.cwd()}/`)("playwright");
const SCRIPTS = dirname(fileURLToPath(import.meta.url));
const EMAIL = "dev@example.com";
const WEB = process.env.WEB_URL || "http://localhost:3000";
async function login() {
	const b = await chromium.launch();
	const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
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
	return { b, ctx, p };
}
const EV = process.argv[2];
const only = (process.argv[3] || "").split(",").filter(Boolean);
const RUN_DIR = process.env.RUN_DIR;
const REPO = process.env.GRABBIN_REPO || process.cwd();
if (!EV || !RUN_DIR) {
	console.error(
		"usage: RUN_DIR=... node drive-editor-journeys.mjs <evidence-dir> [ids]",
	);
	process.exit(2);
}
const sql = (q) =>
	execFileSync("docker", [
		"exec",
		"supabase_db_grabbin",
		"psql",
		"-U",
		"postgres",
		"-tAc",
		q,
	])
		.toString()
		.trim();
const [UID, PAGE, HANDLE] = sql(
	`select u.id || '|' || p.id || '|' || p.handle from "user" u join pages p on p.user_id = u.id where u.email = '${EMAIL}' order by p.created_at limit 1`,
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
const count = (t) =>
	Number(
		sql(
			`select count(*) from page_items where page_id='${PAGE}' and type='${t}'`,
		),
	);
// Local bucket check through the server's local media route (R2_LOCAL_MODE under alchemy dev).
const SERVER = process.env.SERVER_URL || "http://localhost:3001";
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
const { b, ctx, p } = await login();
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
async function journey(id, fn) {
	if (only.length && !only.includes(id)) return;
	const dir = `${EV}/${id}`;
	mkdirSync(dir, { recursive: true });
	const log = [];
	netlog = `${dir}/network.txt`;
	writeFileSync(netlog, "");
	const step = (s) => {
		log.push(s);
		console.log(`[${id}] ${s}`);
	};
	try {
		await p.goto(`${WEB}/${HANDLE}`, {
			waitUntil: "networkidle",
			timeout: 240000,
		});
		step(`db before: ${items() || "(none)"}`);
		await p.screenshot({ path: `${dir}/before.png`, fullPage: true });
		await fn(step, dir);
		await p.screenshot({ path: `${dir}/after.png`, fullPage: true });
		writeFileSync(
			`${dir}/after.aria.txt`,
			await p.locator("body").ariaSnapshot(),
		);
		step(`db after: ${items() || "(none)"}`);
		step("RESULT: PASS");
		results.push(`${id}: PASS`);
	} catch (e) {
		step(`RESULT: FAIL ${e.message.split("\n")[0]}`);
		results.push(`${id}: FAIL`);
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
		writeFileSync(
			`${dir}/actions.md`,
			log.map((l) => `- ${l}`).join("\n") + "\n",
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
		await p.waitForTimeout(500);
	}
	throw new Error(`timeout: ${what}; items=${items()}`);
};
const reloadCheck = async (step, t, n) => {
	await p.waitForTimeout(2500);
	await p.reload({ waitUntil: "networkidle" });
	const c = count(t);
	step(`after reload: ${t} rows = ${c}`);
	if (c !== n) throw new Error(`${t} expected ${n}, got ${c}`);
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
	if (cloudR2.length)
		throw new Error(`cloud R2 requests: ${cloudR2.join(", ")}`);
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
	await p.waitForTimeout(1000);
	release("abort");
	step("released the held PUT as aborted (never reached the local bucket)");
	const req = await cancelReq;
	step(
		`cancel request: ${req ? req.method() + " " + new URL(req.url()).pathname + " -> " + (await req.response())?.status() : "none"}`,
	);
	await p.waitForTimeout(4000);
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
	if (cloudR2.length)
		throw new Error(`cloud R2 requests: ${cloudR2.join(", ")}`);
	step("no request to *.r2.cloudflarestorage.com");
	if (!req) throw new Error("app sent no cancel request");
});

await journey("link-refresh", async (step, dir) => {
	const before = count("link");
	await toolbar.getByRole("button", { name: "Add link" }).click();
	await p
		.getByRole("textbox", { name: "Link URL" })
		.fill("https://github.com/honojs/hono");
	await p.keyboard.press("Enter");
	step("toolbar Add link → https://github.com/honojs/hono + Enter");
	await until(() => count("link") > before, "link row");
	await p.waitForTimeout(6000);
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
		`request: ${r ? r.request().method() + " " + new URL(r.url()).pathname + new URL(r.url()).search.slice(0, 80) + " -> " + r.status() : "none"}`,
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
	for (const [btn, t] of [
		["Add text", "text"],
		["Add section", "section"],
		["Add link", null],
		["Add map", "map"],
	]) {
		const types = sql(
			`select string_agg(type||'='||c, ',') from (select type, count(*) c from page_items where page_id='${PAGE}' group by type) x`,
		);
		await toolbar.getByRole("button", { name: btn }).click();
		await p.waitForTimeout(1500);
		writeFileSync(
			`${dir}/${btn.replace(" ", "-")}.aria.txt`,
			await p.locator("body").ariaSnapshot(),
		);
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
		await p.waitForTimeout(3000);
		const after = sql(
			`select string_agg(type||'='||c, ',') from (select type, count(*) c from page_items where page_id='${PAGE}' group by type) x`,
		);
		step(`${btn}: types ${types} -> ${after}`);
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
	await p.waitForTimeout(3000);
	await p.reload({ waitUntil: "networkidle" });
	const after = Number(
		sql(`select count(*) from page_items where page_id='${PAGE}'`),
	);
	step(`after reload: page_items ${before} -> ${after}; ${items()}`);
	if (after !== before - 1)
		throw new Error("Delete item did not remove the DB row");
});

console.log(results.join("\n"));
await b.close();
