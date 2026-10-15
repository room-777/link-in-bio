// Sign in as the shared local fixture, create its handle through the UI, and capture proof.
// Usage (from a directory where `playwright` is installed):
//   node <skill>/scripts/drive-create-page.mjs <EVIDENCE_DIR>
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { requireEvidenceDir } from "./evidence-path.mjs";

const [evidenceArgument] = process.argv.slice(2);
if (!evidenceArgument)
	throw new Error("usage: drive-create-page.mjs <EVIDENCE_DIR>");
const evidence = requireEvidenceDir(evidenceArgument);
const { chromium } = createRequire(`${process.cwd()}/`)("playwright");

const email = "featuremap@example.com";
const handle = "featuremap-test";
const skillScripts = dirname(fileURLToPath(import.meta.url));
const otpScript = join(skillScripts, "otp.sh");
mkdirSync(evidence, { recursive: true });
const log = [];
const step = (line) => {
	log.push(line);
	console.log(line);
};
const browser = await chromium.launch({
	executablePath: process.env.CHROMIUM_PATH,
});
const context = await browser.newContext();
const page = await context.newPage();

try {
	await page.goto("http://127.0.0.1:3000/sign-in", {
		waitUntil: "networkidle",
		timeout: 240_000,
	});
	await page.getByRole("textbox", { name: "Email" }).fill(email);
	await page.getByRole("button", { name: "Send OTP" }).click();
	await page.getByRole("heading", { name: "Check your inbox" }).waitFor();
	const otp = execFileSync(otpScript, [email]).toString().trim();
	if (!/^\d{6}$/.test(otp))
		throw new Error("local OTP was not a six-digit code");
	await page.getByRole("textbox").first().fill(otp);
	const verified = page.waitForResponse((response) =>
		response.url().endsWith("/auth/sign-in/email-otp"),
	);
	await page.getByRole("button", { name: "Verify code" }).click();
	step(`OTP verification returned ${(await verified).status()}`);
	await page.waitForURL((url) => !url.pathname.startsWith("/sign-in"), {
		timeout: 180_000,
	});
	if (new URL(page.url()).pathname === "/create") {
		await page.waitForLoadState("networkidle");
		// Client components may hydrate after the signed-in route becomes visible.
		await page.waitForTimeout(3_000);
		const handleInput = page.getByRole("textbox", { name: "Handle" });
		const handleCheck = page.waitForResponse(
			(response) =>
				new URL(response.url()).pathname === "/pages/check" &&
				new URL(response.url()).searchParams.get("handle") === handle,
			{ timeout: 15_000 },
		);
		await handleInput.fill(handle);
		const availability = await handleCheck;
		if (!availability.ok() || !(await availability.json()).available)
			throw new Error("shared page handle is unavailable");
		await page.getByRole("button", { name: "Grab it" }).click();
		await page.getByRole("heading", { name: "Looking good!" }).waitFor({
			timeout: 60_000,
		});
		await page.screenshot({ path: `${evidence}/page-created.png` });
		await page.getByRole("button", { name: "Go to profile" }).click();
		await page.waitForURL(`**/${handle}`, { timeout: 60_000 });
		step(`Created ${page.url()} through /create`);
	} else if (new URL(page.url()).pathname !== `/${handle}`) {
		throw new Error(
			`unexpected signed-in route: ${new URL(page.url()).pathname}`,
		);
	} else {
		step(`Shared handle already exists: ${page.url()}`);
	}
	await page.screenshot({ path: `${evidence}/owner-page.png`, fullPage: true });
	writeFileSync(
		`${evidence}/owner-page.aria.txt`,
		await page.locator("body").ariaSnapshot(),
	);
	step(`RESULT: PASS ${handle}`);
} catch (error) {
	step(
		`RESULT: FAIL ${error instanceof Error ? error.message : String(error)}`,
	);
	process.exitCode = 1;
} finally {
	writeFileSync(
		`${evidence}/actions.md`,
		`${log.map((line) => `- ${line}`).join("\n")}\n`,
	);
	await browser.close();
}
