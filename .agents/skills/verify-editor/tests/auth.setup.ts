import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { expect, test } from "@playwright/test";

const email = "featuremap@example.com";
const handle = "featuremap-test";

test("sign in once and save the shared owner session", async ({ page }) => {
	const statePath = process.env.PLAYWRIGHT_STORAGE_STATE;
	if (!statePath) throw new Error("PLAYWRIGHT_STORAGE_STATE is required");

	await page.addInitScript(() => {
		const state = window as Window & {
			__gaCalls?: unknown[][];
			gtag?: (...args: unknown[]) => void;
		};
		state.__gaCalls = [];
		state.gtag = (...args) => state.__gaCalls?.push(args);
	});
	await page.goto("/sign-in", { waitUntil: "networkidle" });
	await page.getByRole("textbox", { name: "Email" }).fill(email);
	await page.getByRole("button", { name: "Send OTP" }).click();
	await expect(
		page.getByRole("heading", { name: "Check your inbox" }),
	).toBeVisible();
	await page.getByRole("button", { name: "Use a different email" }).click();
	await expect(page.getByRole("textbox", { name: "Email" })).toHaveValue(email);
	await page.getByRole("button", { name: "Send OTP" }).click();
	await expect(
		page.getByRole("heading", { name: "Check your inbox" }),
	).toBeVisible();

	const otp = execFileSync(
		".agents/skills/verify-editor/scripts/otp.sh",
		[email],
		{ encoding: "utf8" },
	).trim();
	expect(otp).toMatch(/^\d{6}$/);
	const otpInput = page.getByRole("textbox").first();
	await otpInput.fill(otp === "000000" ? "000001" : "000000");
	await page.getByRole("button", { name: "Verify code" }).click();
	await expect(otpInput).toHaveAttribute("aria-invalid", "true");
	expect(
		(await page.context().cookies()).some((cookie) =>
			cookie.name.includes("session_token"),
		),
	).toBe(false);
	const resent = page.waitForResponse((response) => {
		const url = new URL(response.url());
		return (
			url.pathname.endsWith("/auth/email-otp/send-verification-otp") &&
			response.request().method() === "POST"
		);
	});
	await page.getByRole("button", { name: "Resend code" }).click();
	expect((await resent).ok()).toBe(true);
	const latestOtp = execFileSync(
		".agents/skills/verify-editor/scripts/otp.sh",
		[email],
		{ encoding: "utf8" },
	).trim();
	expect(latestOtp).toMatch(/^\d{6}$/);
	await otpInput.fill(latestOtp);
	const verified = page.waitForResponse((response) =>
		new URL(response.url()).pathname.endsWith("/auth/sign-in/email-otp"),
	);
	await page.getByRole("button", { name: "Verify code" }).click();
	const verificationResponse = await verified;
	expect(
		verificationResponse.ok(),
		`email OTP sign-in failed (${verificationResponse.status()}): ${await verificationResponse.text()}`,
	).toBe(true);
	await page.waitForURL((url) => !url.pathname.startsWith("/sign-in"));
	expect(
		(await page.context().cookies()).some((cookie) =>
			cookie.name.includes("session_token"),
		),
	).toBe(true);
	await expect
		.poll(() =>
			page.evaluate(() => {
				const state = window as Window & { __gaCalls?: unknown[][] };
				return (state.__gaCalls ?? []).some(
					([kind, name]) => kind === "event" && name === "login",
				);
			}),
		)
		.toBe(true);
	await expect
		.poll(() =>
			page.evaluate(() => {
				const state = window as Window & { __gaCalls?: unknown[][] };
				return (state.__gaCalls ?? []).some(
					([kind, name]) => kind === "event" && name === "sign_up_start",
				);
			}),
		)
		.toBe(true);

	if (new URL(page.url()).pathname === "/create") {
		const handleInput = page.getByRole("textbox", { name: "Handle" });
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
