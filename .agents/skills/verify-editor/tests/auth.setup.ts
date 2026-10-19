import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { expect, test } from "@playwright/test";

const email = "featuremap@example.com";
const invalidOtpEmail = "invalid-otp@example.com";
const handle = "featuremap-test";

const readOtp = (address: string) =>
	execFileSync(".agents/skills/verify-editor/scripts/otp.sh", [address], {
		encoding: "utf8",
	}).trim();

test("sign in once and save the shared owner session", async ({ page }) => {
	const statePath = process.env.PLAYWRIGHT_STORAGE_STATE;
	if (!statePath) throw new Error("PLAYWRIGHT_STORAGE_STATE is required");

	await page.goto("/sign-in", { waitUntil: "networkidle" });
	await page.getByRole("textbox", { name: "Email" }).fill(invalidOtpEmail);
	await page.getByRole("button", { name: "Send OTP" }).click();
	await expect(
		page.getByRole("heading", { name: "Check your inbox" }),
	).toBeVisible();
	const invalidOtp = readOtp(invalidOtpEmail);
	expect(invalidOtp).toMatch(/^\d{6}$/);
	const otpInput = page.getByRole("textbox").first();
	await otpInput.fill(invalidOtp === "000000" ? "000001" : "000000");
	const rejected = page.waitForResponse((response) =>
		new URL(response.url()).pathname.endsWith("/auth/sign-in/email-otp"),
	);
	await page.getByRole("button", { name: "Verify code" }).click();
	const rejectedResponse = await rejected;
	expect(rejectedResponse.status()).toBe(400);
	await expect(otpInput).toHaveAttribute("aria-invalid", "true");
	expect(
		(await page.context().cookies()).some((cookie) =>
			cookie.name.includes("session_token"),
		),
	).toBe(false);
	await page.getByRole("button", { name: "Use a different email" }).click();
	await expect(page.getByRole("textbox", { name: "Email" })).toHaveValue(
		invalidOtpEmail,
	);
	await page.getByRole("textbox", { name: "Email" }).fill(email);
	await page.getByRole("button", { name: "Send OTP" }).click();
	await expect(
		page.getByRole("heading", { name: "Check your inbox" }),
	).toBeVisible();

	const otp = readOtp(email);
	expect(otp).toMatch(/^\d{6}$/);
	await otpInput.fill(otp);
	const verified = page.waitForResponse((response) =>
		new URL(response.url()).pathname.endsWith("/auth/sign-in/email-otp"),
	);
	await page.getByRole("button", { name: "Verify code" }).click();
	const verificationResponse = await verified;
	if (!verificationResponse.ok()) {
		const responseBody = await verificationResponse
			.text()
			.catch(() => "response body unavailable");
		throw new Error(
			`email OTP sign-in failed (${verificationResponse.status()}): ${responseBody}`,
		);
	}
	await page.waitForURL((url) => !url.pathname.startsWith("/sign-in"));
	await page.waitForLoadState("networkidle");
	expect(
		(await page.context().cookies()).some((cookie) =>
			cookie.name.includes("session_token"),
		),
	).toBe(true);
	if (new URL(page.url()).pathname === "/create") {
		const handleInput = page.getByRole("textbox", { name: "Handle" });
		await handleInput.fill(`${handle}-check`);
		await page.locator('#handle-status-icon[data-state="checking"]').waitFor();
		const available = page.waitForResponse((response) => {
			const url = new URL(response.url());
			return (
				url.pathname === "/pages/check" &&
				url.searchParams.get("handle") === handle
			);
		});
		await handleInput.fill(handle);
		const availability = await available;
		if (!availability.ok() || !(await availability.json()).available) {
			throw new Error("shared page handle is unavailable");
		}
		await page.getByRole("button", { name: "Grab it" }).click();
		await expect(
			page.getByRole("heading", { name: "Looking good!" }),
		).toBeVisible();
		await page.getByRole("button", { name: "Go to profile" }).click();
		await page.waitForURL(`**/${handle}`);
	} else {
		await page.waitForURL(`**/${handle}`);
	}
	await expect(
		page.getByRole("group", { name: "Page editor toolbar" }),
	).toBeVisible();

	mkdirSync(dirname(statePath), { recursive: true });
	await page.context().storageState({ path: statePath });
});
