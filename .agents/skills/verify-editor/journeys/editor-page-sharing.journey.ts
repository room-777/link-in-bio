import { expect, journey } from "../harness/fixtures.ts";
import { reloadReady, settled } from "../harness/journey.ts";
import { proof, WEB } from "../harness/local.ts";
import { control, exactText } from "../harness/ui.ts";

const test = journey("editor-page-sharing");

test("share-open", async ({ ownerPage: page }) => {
	await control(page, "button", "Share page").click();
	await expect(control(page, "dialog", "Share your page")).toBeVisible();
	await proof(page, "editor-page-sharing", "share-dialog");
});

test("share-qr", async ({ ownerPage: page }) => {
	const dialog = control(page, "dialog", "Share your page");
	await expect(control(dialog, "img", "QR code for your page")).toBeVisible();
});

test("share-copy", async ({ ownerPage: page, owner }) => {
	const dialog = control(page, "dialog", "Share your page");
	await control(dialog, "button", "Copy Link").click();
	await expect(exactText(dialog, "Copied Link")).toBeVisible();
	expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
		`${WEB}/${owner.handle}-ci-failure-probe`,
	);
	await control(dialog, "button", "Close").click();
	await expect(dialog).toBeHidden();
});

test("share-mobile", async ({ ownerPage: page }) => {
	await page.setViewportSize({ width: 390, height: 844 });
	await reloadReady(page);
	await settled(page);
	await control(page, "button", "Share link").click();
	await expect(control(page, "dialog", "Share your page")).toBeVisible();
	await proof(page, "editor-page-sharing", "share-mobile");
	await page.keyboard.press("Escape");
	await page.setViewportSize({ width: 1365, height: 900 });
});
