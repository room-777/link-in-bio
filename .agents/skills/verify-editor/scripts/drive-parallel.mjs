// Runs drive-all.mjs once per journey group, all groups at the same time.
// Each group gets its own owner account, page, and session (seeded here), so
// groups share no page items, profile, handle, or uploads. Journeys that read
// what an earlier journey made stay in one group, in their original order.
// Usage: node drive-parallel.mjs <run-dir>
import { spawn } from "node:child_process";
import { createHmac, randomBytes } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ACCOUNT, db, HANDLE, STATE } from "./local.mjs";

// Wall-clock limit for the whole parallel run. Measured 3 clean runs at
// 114 s (par-1); a run past this budget fails so slow waits cannot creep back.
const BUDGET_S = Number(process.env.FEATUREMAP_BUDGET_S ?? 150);
const GROUPS = [
	["sign-in-email-otp", "editor-page-sharing"],
	["editor-profile-and-handle"],
	[
		"editor-add-item",
		"editor-text-formatting",
		"editor-layout",
		"editor-inline-destination-url",
		"editor-link-metadata",
		"editor-link-card-images",
	],
	["editor-advanced-widgets"],
	["editor-map-editing", "editor-tweet"],
	["editor-media-upload", "editor-media-editing"],
];

const runDir = path.resolve(process.argv[2] ?? "");
if (!process.argv[2])
	throw new Error("Usage: node drive-parallel.mjs <run-dir>");
const script = fileURLToPath(new URL("./drive-all.mjs", import.meta.url));
const secret = JSON.parse(
	readFileSync(path.join(runDir, "server.wrangler.jsonc"), "utf8"),
).vars.BETTER_AUTH_SECRET;

const sql = (value) => `'${String(value).replaceAll("'", "''")}'`;

// Copies the base owner (user, page, local Pro subscription) and signs a new
// session cookie the way better-auth does: `${token}.${base64 HMAC-SHA256}`.
function seedOwner(index) {
	const email = ACCOUNT.replace("@", `+g${index}@`);
	const handle = `${HANDLE}-g${index}`;
	const userId = `featuremap-g${index}`;
	const baseUser = db(`select id from "user" where email=${sql(ACCOUNT)}`);
	db(`delete from "user" where id=${sql(userId)}`);
	db(`insert into "user" (id, name, email, email_verified, image, creem_customer_id, had_trial, created_at, updated_at, role)
		select ${sql(userId)}, name, ${sql(email)}, email_verified, image, null, had_trial, now(), now(), role from "user" where id=${sql(baseUser)}`);
	db(`insert into pages (id, user_id, handle, name, bio, image_key, image_source, image_crop, role, created_at, updated_at)
		select gen_random_uuid()::text, ${sql(userId)}, ${sql(handle)}, name, bio, image_key, image_source, image_crop, role, now(), now()
		from pages where user_id=${sql(baseUser)} and handle=${sql(HANDLE)}`);
	db(`insert into creem_subscription (id, product_id, reference_id, creem_customer_id, creem_subscription_id, status, period_start, period_end, cancel_at_period_end)
		select ${sql(`${userId}-sub`)}, product_id, ${sql(userId)}, ${sql(`${userId}-customer`)}, ${sql(`${userId}-subscription`)}, status, period_start, period_end, cancel_at_period_end
		from creem_subscription where reference_id=${sql(baseUser)}`);
	const token = randomBytes(24).toString("base64url");
	db(`insert into session (id, expires_at, token, created_at, updated_at, user_id)
		values (${sql(`${userId}-session`)}, now() + interval '7 days', ${sql(token)}, now(), now(), ${sql(userId)})`);
	const signature = createHmac("sha256", secret).update(token).digest("base64");
	const state = JSON.parse(readFileSync(STATE, "utf8"));
	state.cookies = state.cookies
		.filter((cookie) => cookie.name !== "better-auth.session_data")
		.map((cookie) =>
			cookie.name === "better-auth.session_token"
				? { ...cookie, value: encodeURIComponent(`${token}.${signature}`) }
				: cookie,
		);
	const file = path.join(runDir, `owner-g${index}.json`);
	writeFileSync(file, JSON.stringify(state), { mode: 0o600 });
	return {
		FEATUREMAP_ACCOUNT: email,
		FEATUREMAP_HANDLE: handle,
		FEATUREMAP_STATE: file,
	};
}

function runGroup(features, index) {
	const dir = path.join(runDir, "groups", `g${index}`);
	mkdirSync(dir, { recursive: true });
	const owner = index === 0 ? {} : seedOwner(index);
	const started = Date.now();
	return new Promise((resolve) => {
		const child = spawn(process.execPath, [script, dir], {
			env: {
				...process.env,
				...owner,
				FEATUREMAP_JOURNEYS: features.join(","),
			},
			stdio: ["ignore", "pipe", "pipe"],
		});
		const log = [];
		child.stdout.on("data", (chunk) => log.push(chunk));
		child.stderr.on("data", (chunk) => log.push(chunk));
		child.on("close", (code) => {
			writeFileSync(path.join(dir, "drive-all.log"), Buffer.concat(log));
			resolve({
				index,
				features,
				dir,
				code,
				seconds: (Date.now() - started) / 1000,
			});
		});
	});
}

const started = Date.now();
const groups = await Promise.all(GROUPS.map(runGroup));
const seconds = (Date.now() - started) / 1000;

const summaries = [];
const timings = [];
const failures = [];
for (const group of groups) {
	let results;
	try {
		results = JSON.parse(
			readFileSync(path.join(group.dir, "results.json"), "utf8"),
		);
	} catch {
		failures.push(
			`group g${group.index} exited ${group.code} without results.json`,
		);
		continue;
	}
	// A journey can record a row for another feature (media-editing records
	// inline-destination-url/media-destination-add), so merge rows by feature.
	for (const summary of results.summaries)
		summaries.push(...summary.subfeatures);
	for (const timing of results.timings)
		timings.push({ group: `g${group.index}`, ...timing });
	if (group.code !== 0)
		failures.push(`group g${group.index} exited ${group.code}`);
}
const sha = groups.length
	? JSON.parse(readFileSync(path.join(groups[0].dir, "results.json"), "utf8"))
			.sha
	: "";
const ordered = GROUPS.flat().map((feature) => {
	const rows = summaries.filter((row) => row.feature === feature);
	const status =
		rows.length && rows.every((row) => row.status === "PASS") ? "PASS" : "FAIL";
	return { feature, status, subfeatures: rows };
});
const subfeatures = ordered.flatMap((summary) => summary.subfeatures);
const failed = subfeatures.filter((row) => row.status !== "PASS");
if (seconds > BUDGET_S)
	failures.push(
		`run took ${seconds.toFixed(1)} s, over the ${BUDGET_S} s budget`,
	);
writeFileSync(
	path.join(runDir, "results.json"),
	`${JSON.stringify({ sha, run: path.basename(runDir), seconds, budgetSeconds: BUDGET_S, groups: groups.map(({ dir, ...group }) => group), timings, summaries: ordered, failures }, null, 2)}\n`,
);
writeFileSync(
	path.join(runDir, "results.md"),
	[
		"# Feature map run results (parallel)",
		"",
		`Checkout SHA: ${sha}`,
		`Wall time: ${seconds.toFixed(1)} s (budget ${BUDGET_S} s)`,
		"",
		"| Group | Journeys | Seconds | Exit |",
		"| --- | --- | --- | --- |",
		...groups.map(
			(group) =>
				`| g${group.index} | ${group.features.join(", ")} | ${group.seconds.toFixed(1)} | ${group.code} |`,
		),
		"",
		"| Feature | Result | Sub-feature evidence |",
		"| --- | --- | --- |",
		...ordered.map(
			(summary) =>
				`| ${summary.feature} | ${summary.status} | ${summary.subfeatures.map((row) => `${row.subfeature}: ${row.status} (${row.evidence.replaceAll("|", "/")})`).join("<br>")} |`,
		),
		"",
		...failures.map((failure) => `- ${failure}`),
	].join("\n"),
);
console.log(
	`${subfeatures.length - failed.length}/${subfeatures.length} sub-features passed in ${seconds.toFixed(1)} s across ${groups.length} groups${failures.length ? `; ${failures.join("; ")}` : ""}`,
);
if (failed.length || failures.length) process.exitCode = 1;
