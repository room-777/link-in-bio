import type { Page } from "@playwright/test";
import {
	FIXTURE_IMAGE,
	itemData,
	REPLACEMENT_IMAGE,
} from "../harness/editor.ts";
import { expect, journey } from "../harness/fixtures.ts";
import { reloadReady, settled } from "../harness/journey.ts";
import { API, proof } from "../harness/local.ts";
import { control, item } from "../harness/ui.ts";

const test = journey("editor-link-card-images");
let added = "";
let replaced = "";

function imageKey(data: string): string {
	return (JSON.parse(data) as { imageKey?: string | null }).imageKey ?? "";
}

async function objectStatus(page: Page, data: string) {
	const response = await page
		.context()
		.request.get(`${API}/media/${imageKey(data)}`);
	return response.status();
}

async function chooseImage(
	page: Page,
	linkId: string,
	label: string,
	file: string,
) {
	const chooser = page.waitForEvent("filechooser");
	await control(item(page, linkId), "button", label).click();
	await (await chooser).setFiles(file);
}

test("link-image-add", async ({ ownerPage: page, linkItem }) => {
	// Image controls exist only on presets with an image area.
	await control(item(page, linkItem), "button", "Full square").click();
	await settled(page);
	const before = await itemData(linkItem);
	await chooseImage(page, linkItem, "Add link image", FIXTURE_IMAGE);
	await expect
		.poll(
			async () => {
				added = await itemData(linkItem);
				return added !== before && imageKey(added) !== "";
			},
			{ timeout: 20_000 },
		)
		.toBe(true);
	expect(await objectStatus(page, added)).toBe(200);
});

test("link-image-replace", async ({ ownerPage: page, linkItem }) => {
	await chooseImage(page, linkItem, "Replace link image", REPLACEMENT_IMAGE);
	await expect
		.poll(
			async () => {
				replaced = await itemData(linkItem);
				return replaced !== added && imageKey(replaced) !== "";
			},
			{ timeout: 20_000 },
		)
		.toBe(true);
	expect(await objectStatus(page, replaced)).toBe(200);
});

test("link-image-persist", async ({ ownerPage: page, linkItem }) => {
	await reloadReady(page);
	const persisted = await itemData(linkItem);
	expect(persisted).toBe(replaced);
	expect(await objectStatus(page, persisted)).toBe(200);
});

test("link-image-remove", async ({ ownerPage: page, linkItem }) => {
	await control(item(page, linkItem), "button", "Remove link image").click();
	await expect
		.poll(() => itemData(linkItem), { timeout: 15_000 })
		.not.toContain('"imageKey":"');
	await proof(page, "editor-link-card-images", "link-image-removed");
});
