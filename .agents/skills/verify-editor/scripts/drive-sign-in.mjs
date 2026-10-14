// Drive email-OTP sign-in for a reserved example.com address and check where the user lands.
// Usage (from a directory where `playwright` is installed):
//   node <skill>/scripts/drive-sign-in.mjs <EVIDENCE_DIR> [email@example.com]
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const { chromium } = createRequire(`${process.cwd()}/`)("playwright");
const [evidence, email = "dev@example.com"] = process.argv.slice(2);
if (!evidence)
	throw new Error(
		"usage: drive-sign-in.mjs <EVIDENCE_DIR> [email@example.com]",
	);
// RESEND_API_KEY may be real: never send a code to a deliverable mailbox.
if (!/@example\.(com|org|net)$/.test(email))
	throw new Error("use an @example.com address only");
const otpScript = join(dirname(fileURLToPath(import.meta.url)), "otp.sh");
mkdirSync(evidence, { recursive: true });
const log = [];
const step = (line) => {
	log.push(line);
	console.log(line);
};

const browser = await chromium.launch();
const context = await browser.newContext();
const page = await context.newPage();
try {
	await page.goto("http://127.0.0.1:3000/sign-in", {
		waitUntil: "networkidle",
		timeout: 240_000,
	});
	await page.getByRole("textbox", { name: "Email" }).fill(email);
	await page.getByRole("button", { name: "Send OTP" }).click();
	await page
		.getByRole("heading", { name: "Check your inbox" })
		.waitFor({ timeout: 30_000 });
	await page.screenshot({ path: `${evidence}/otp-sent.png` });
	const otp = execFileSync(otpScript, [email]).toString().trim();
	step(`OTP read from local DB (length ${otp.length})`);
	await page.getByRole("textbox").first().fill(otp);
	const verified = page.waitForResponse((r) =>
		r.url().endsWith("/auth/sign-in/email-otp"),
	);
	await page.getByRole("button", { name: "Verify code" }).click();
	step(`POST /auth/sign-in/email-otp -> ${(await verified).status()}`);
	const cookies = (await context.cookies()).map((c) => c.name);
	step(`session cookie set: ${cookies.includes("better-auth.session_token")}`);
	await page
		.waitForURL((url) => !url.pathname.startsWith("/sign-in"), {
			timeout: 180_000,
		})
		.catch(() => {});
	await page.screenshot({ path: `${evidence}/after-verify.png` });
	writeFileSync(
		`${evidence}/after-verify.aria.txt`,
		await page.locator("body").ariaSnapshot(),
	);
	const landed = new URL(page.url()).pathname;
	step(`landed on ${landed}`);
	if (landed.startsWith("/sign-in"))
		throw new Error("signed-in user was not redirected away from /sign-in");
	step("RESULT: PASS");
} catch (error) {
	step(
		`RESULT: FAIL ${error instanceof Error ? error.message : String(error)}`,
	);
	process.exitCode = 1;
} finally {
	writeFileSync(
		`${evidence}/actions.md`,
		`${log.map((l) => `- ${l}`).join("\n")}\n`,
	);
	await browser.close();
}
