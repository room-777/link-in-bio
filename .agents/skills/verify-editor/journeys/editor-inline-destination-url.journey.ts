import type { Page } from "@playwright/test";
import { itemData } from "../harness/editor.ts";
import { expect, journey } from "../harness/fixtures.ts";
import { reloadReady, settled } from "../harness/journey.ts";
import { proof } from "../harness/local.ts";
import { control, item } from "../harness/ui.ts";

const test = journey("editor-inline-destination-url");

async function openTextStyle(page: Page, textId: string) {
	const options = control(
		item(page, textId),
		"button",
		"Open text style options",
	);
	if ((await options.getAttribute("aria-expanded")) !== "true")
		await options.click();
}

async function enterLink(page: Page, url: string) {
	const input = control(page, "textbox", "Link URL").last();
	await input.fill(url);
	await input.press("Enter");
	await settled(page);
	return input;
}

test("text-destination-add", async ({ ownerPage: page, textItem }) => {
	await openTextStyle(page, textItem);
	await control(page, "button", "Add text link").click();
	const input = await enterLink(page, "https://example.com/featuremap-text");
	await expect.poll(() => itemData(textItem)).toContain("featuremap-text");
	await input.press("Escape");
});

test("destination-edit", async ({ ownerPage: page, textItem }) => {
	await openTextStyle(page, textItem);
	await control(page, "button", "Edit text link").click();
	const input = await enterLink(page, "https://example.com/featuremap-updated");
	await expect.poll(() => itemData(textItem)).toContain("featuremap-updated");
	await input.press("Escape");
});

test("destination-validation", async ({ ownerPage: page, textItem }) => {
	await openTextStyle(page, textItem);
	await control(page, "button", "Edit text link").click();
	await enterLink(page, "not a url");
	expect(await itemData(textItem)).toContain("featuremap-updated");
});

test("destination-persist", async ({ ownerPage: page, textItem }) => {
	await reloadReady(page);
	expect(await itemData(textItem)).toContain("featuremap-updated");
});

test("destination-clear", async ({ ownerPage: page, textItem }) => {
	await openTextStyle(page, textItem);
	await control(page, "button", "Edit text link").click();
	await enterLink(page, "");
	await expect
		.poll(() => itemData(textItem))
		.not.toContain("featuremap-updated");
	await proof(page, "editor-inline-destination-url", "destination-cleared");
});

test("media-destination-add", async ({ ownerPage: page, mediaItem }) => {
	await control(item(page, mediaItem), "button", "Add media link").click();
	await enterLink(page, "https://example.com/featuremap-media");
	await expect.poll(() => itemData(mediaItem)).toContain("featuremap-media");
	await proof(page, "editor-inline-destination-url", "media-destination-added");
});
