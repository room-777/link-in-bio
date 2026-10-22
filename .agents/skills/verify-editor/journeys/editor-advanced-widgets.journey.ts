import type { Page } from "@playwright/test";
import { row } from "../harness/editor.ts";
import { expect, journey } from "../harness/fixtures.ts";
import { settled } from "../harness/journey.ts";
import { db, proof, sql } from "../harness/local.ts";
import { control, controlsExcept, exactText } from "../harness/ui.ts";

const test = journey("editor-advanced-widgets");

async function closeDialogs(page: Page) {
	const dialogs = control(page, "dialog");
	for (
		let open = await dialogs.count();
		open > 0;
		open = await dialogs.count()
	) {
		await page.keyboard.press("Escape");
		await expect(dialogs).toHaveCount(open - 1);
	}
}

async function openWidget(page: Page, search: string, name: string) {
	await control(page, "button", "Advanced").click();
	const catalog = control(page, "dialog", "Advanced widgets");
	await control(catalog, "textbox", "Search widgets").fill(search);
	await control(catalog, "button", name).click();
	return control(page, "dialog");
}

const preview = (page: Page) =>
	page.waitForResponse(
		(response) =>
			response.url().includes("/widgets/preview") &&
			response.request().method() === "POST",
	);

test("widget-catalog", async ({ ownerPage: page }) => {
	await control(page, "button", "Advanced").click();
	await expect(control(page, "dialog", "Advanced widgets")).toBeVisible();
});

test("widget-navigation", async ({ ownerPage: page }) => {
	const catalog = control(page, "dialog", "Advanced widgets");
	await control(catalog, "textbox", "Search widgets").fill("spotify");
	await control(catalog, "button", "Spotify").click();
	const detail = control(page, "dialog");
	await expect(detail).toContainText("Spotify");
	await control(detail, "button", "Back to widgets").click();
	await expect(control(page, "dialog", "Advanced widgets")).toBeVisible();
});

test("widget-search", async ({ ownerPage: page }) => {
	const catalog = control(page, "dialog", "Advanced widgets");
	await control(catalog, "textbox", "Search widgets").fill(
		"featuremap-no-such-widget",
	);
	await expect(exactText(catalog, "No widgets found.")).toBeVisible();
});

test("widget-mobile-picker", async ({ ownerPage: page }) => {
	const catalog = control(page, "dialog", "Advanced widgets");
	await control(catalog, "button", "Close").click();
	await expect(catalog).toBeHidden();
	await page.setViewportSize({ width: 390, height: 844 });
	await settled(page);
	await control(page, "button", "Advanced").click();
	await expect(catalog).toBeVisible();
	await proof(page, "editor-advanced-widgets", "widget-mobile-picker");
	await page.mouse.click(10, 10);
	await expect(catalog).toBeHidden();
	await page.setViewportSize({ width: 1365, height: 900 });
	await settled(page);
});

for (const name of ["SoundCloud", "Apple Music", "Signature"])
	test(`widget-coming-soon: ${name}`, async ({ ownerPage: page }) => {
		const detail = await openWidget(page, name, name);
		await expect(detail).toContainText(
			"Sipping coffee while crafting a polished widget",
		);
		await expect(
			controlsExcept(detail, "button", ["Back to widgets", "Close"]),
		).toHaveCount(0);
		await proof(
			page,
			"editor-advanced-widgets",
			`placeholder-${name.toLowerCase().replaceAll(" ", "-")}`,
		);
		await closeDialogs(page);
	});

test("widget-plan-gate", async ({ owner, openOwnerPage }) => {
	const subscription = `select status || '|' || period_end::text from creem_subscription where reference_id=${sql(owner.userId)} and product_id='local-pro'`;
	const before = await row(subscription);
	expect(before).toMatch(/^active\|/);
	const [status, periodEnd] = before.split("|");
	await db(
		`update creem_subscription set status='canceled', period_end=now() - interval '1 minute' where reference_id=${sql(owner.userId)}`,
	);
	try {
		const gatePage = await openOwnerPage();
		await control(gatePage, "button", "Advanced").click();
		await control(
			control(gatePage, "dialog", "Advanced widgets"),
			"button",
			"Spotify",
		).click();
		await expect(control(gatePage, "dialog", "Upgrade to Pro")).toBeVisible();
		await proof(gatePage, "editor-advanced-widgets", "widget-free-plan-gate");
	} finally {
		await db(
			`update creem_subscription set status=${sql(status ?? "")}, period_end=${sql(periodEnd ?? "")}::timestamptz where reference_id=${sql(owner.userId)}`,
		);
	}
	expect(await db(subscription)).toBe(before);
});

test("widget-add-spotify", async ({ ownerPage: page, owner }) => {
	const detail = await openWidget(page, "spotify", "Spotify");
	const loaded = preview(page);
	await control(detail, "textbox", "Spotify URL").fill(
		"https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC",
	);
	expect((await loaded).status()).toBe(200);
	await control(detail, "button", "Add").click();
	await row(
		`select id from page_items where page_id=${sql(owner.pageId)} and type='spotify'`,
	);
	await proof(page, "editor-advanced-widgets", "spotify-added");
	await closeDialogs(page);
});

test("widget-add-rss", async ({ ownerPage: page, owner }) => {
	const detail = await openWidget(page, "RSS Feed", "RSS Feed");
	await control(detail, "textbox", "RSS feed URL").fill(
		"https://featuremap.hashnode.dev",
	);
	const loaded = preview(page);
	await control(detail, "button", "Add").click();
	expect((await loaded).status()).toBe(200);
	await row(
		`select id from page_items where page_id=${sql(owner.pageId)} and type='rss'`,
	);
	await proof(page, "editor-advanced-widgets", "rss-added");
	await closeDialogs(page);
});
