import { execFileSync } from "node:child_process";
import { expect, test } from "@playwright/test";

const sql = (statement: string) =>
	execFileSync(
		"docker",
		[
			"exec",
			"grabbin-featuremap-postgres",
			"psql",
			"-X",
			"-v",
			"ON_ERROR_STOP=1",
			"-U",
			"postgres",
			"-d",
			"postgres",
			"-Atc",
			statement,
		],
		{ encoding: "utf8" },
	).trim();

test("analytics-events: a new local user creates a page through /create", async ({
	browser,
}) => {
	const suffix = `${Date.now()}`;
	const newEmail = `featuremap-${suffix}@example.com`;
	const newHandle = `featuremap-${suffix}`;
	const context = await browser.newContext({
		storageState: { cookies: [], origins: [] },
	});
	await context.addInitScript(() => {
		const state = window as Window & {
			__gaCalls?: unknown[][];
			gtag?: (...args: unknown[]) => void;
		};
		state.__gaCalls = JSON.parse(
			localStorage.getItem("feature-map-ga-calls") ?? "[]",
		);
		state.gtag = (...args) => {
			state.__gaCalls ??= [];
			state.__gaCalls.push(args);
			localStorage.setItem(
				"feature-map-ga-calls",
				JSON.stringify(state.__gaCalls),
			);
		};
	});
	const page = await context.newPage();
	try {
		await page.goto("http://127.0.0.1:3000/sign-in", {
			waitUntil: "networkidle",
		});
		await page.getByRole("textbox", { name: "Email" }).fill(newEmail);
		await page.getByRole("button", { name: "Send OTP" }).click();
		await expect(
			page.getByRole("heading", { name: "Check your inbox" }),
		).toBeVisible();
		const otp = execFileSync(
			".agents/skills/verify-editor/scripts/otp.sh",
			[newEmail],
			{ encoding: "utf8" },
		).trim();
		await page.getByRole("textbox").first().fill(otp);
		await page.getByRole("button", { name: "Verify code" }).click();
		await page.waitForURL("**/create");
		await expect(page.getByRole("textbox", { name: "Handle" })).toBeVisible();
		const available = page.waitForResponse((response) => {
			const url = new URL(response.url());
			return (
				url.pathname === "/pages/check" &&
				url.searchParams.get("handle") === newHandle
			);
		});
		await page.getByRole("textbox", { name: "Handle" }).fill(newHandle);
		const availability = await available;
		expect(availability.ok()).toBe(true);
		expect(await availability.json()).toMatchObject({ available: true });
		await page.getByRole("button", { name: "Grab it" }).click();
		await expect(
			page.getByRole("heading", { name: "Looking good!" }),
		).toBeVisible();
		expect(sql(`select count(*) from "user" where email='${newEmail}'`)).toBe(
			"1",
		);
		expect(sql(`select count(*) from pages where handle='${newHandle}'`)).toBe(
			"1",
		);
		await expect
			.poll(() =>
				page.evaluate(() => {
					const state = window as Window & { __gaCalls?: unknown[][] };
					return (state.__gaCalls ?? []).some(
						([kind, name]) => kind === "event" && name === "sign_up",
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
		await expect
			.poll(() =>
				page.evaluate(() => {
					const state = window as Window & { __gaCalls?: unknown[][] };
					return (state.__gaCalls ?? []).some(
						([kind, name]) => kind === "event" && name === "page_created",
					);
				}),
			)
			.toBe(true);
	} finally {
		await context.close();
		sql(`delete from "user" where email='${newEmail}'`);
	}
});
