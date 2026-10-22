import { expect, journey } from "../harness/fixtures.ts";
import { gotoReady, settled } from "../harness/journey.ts";
import { ACCOUNT, API, db, proof, sql, WEB } from "../harness/local.ts";
import { control, otpInput } from "../harness/ui.ts";

const test = journey("sign-in-email-otp");

test("otp-request", async ({ signedOutPage: page }) => {
	await gotoReady(page, "/sign-in");
	await control(page, "textbox", "Email").fill(ACCOUNT);
	await expect(control(page, "button", "Send OTP")).toBeEnabled();
	await control(page, "button", "Send OTP").click();
	await expect(control(page, "heading", "Check your inbox")).toBeVisible();
	await proof(page, "sign-in-email-otp", "otp-requested");
});

test("otp-change-email", async ({ signedOutPage: page }) => {
	await control(page, "button", "Use a different email").click();
	await expect(control(page, "textbox", "Email")).toBeVisible();
});

test("otp-verify", async ({ signedOutPage: page }) => {
	await control(page, "textbox", "Email").fill(ACCOUNT);
	await control(page, "button", "Send OTP").click();
	await expect(control(page, "heading", "Check your inbox")).toBeVisible();
	const code = await db(
		`select split_part(value, ':', 1) from verification where identifier=${sql(`sign-in-otp-${ACCOUNT}`)} and expires_at > now() order by created_at desc limit 1`,
	);
	expect(code, "unexpired six-digit OTP in the isolated DB").toMatch(/^\d{6}$/);
	const input = otpInput(page);
	await input.fill("");
	await input.pressSequentially(code);
	await expect(input).toHaveValue(code);
	const verified = page.waitForResponse((response) =>
		response.url().includes("/auth/sign-in/email-otp"),
	);
	await control(page, "button", "Verify code").click();
	await verified;
	await settled(page);
	const session = await page.context().request.get(`${API}/auth/get-session`);
	expect(session.ok()).toBe(true);
	expect((await session.json())?.user?.id).toBeTruthy();
	expect(await page.context().cookies()).not.toHaveLength(0);
	await proof(page, "sign-in-email-otp", "otp-verified");
});

test("otp-landing", async ({ signedOutPage: page }) => {
	await expect(page).not.toHaveURL(/\/sign-in$/);
	expect(page.url().startsWith(WEB)).toBe(true);
	expect(
		await db(`select id from "user" where email=${sql(ACCOUNT)}`),
	).not.toBe("");
});
