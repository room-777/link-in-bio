import { itemData } from "../harness/editor.ts";
import { expect, journey } from "../harness/fixtures.ts";
import { reloadReady, settled } from "../harness/journey.ts";
import { proof } from "../harness/local.ts";
import { control, item, marker } from "../harness/ui.ts";

const test = journey("editor-media-editing");
const CAPTION = "Feature map media caption";
let captioned = "";
let cropped = "";

test("media-caption", async ({ ownerPage: page, mediaItem }) => {
	await control(item(page, mediaItem), "textbox", "Media caption").fill(
		CAPTION,
	);
	await settled(page);
	await expect.poll(() => itemData(mediaItem)).toContain(CAPTION);
	captioned = await itemData(mediaItem);
});

test("media-crop", async ({ ownerPage: page, mediaItem }) => {
	const card = item(page, mediaItem);
	await control(card, "button", "Crop media").click();
	await expect(marker(card, "data-bento-item-crop-open")).toBeVisible();
	const box = await control(card, "button", "Drag media to crop").boundingBox();
	expect(box, "crop handle is on screen").not.toBeNull();
	if (box) {
		await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
		await page.mouse.down();
		await page.mouse.move(
			box.x + box.width / 2 + 20,
			box.y + box.height / 2 + 14,
			{ steps: 8 },
		);
		await page.mouse.up();
	}
	await control(card, "button", "Apply media crop").click();
	await settled(page);
	await expect.poll(() => itemData(mediaItem)).not.toBe(captioned);
	cropped = await itemData(mediaItem);
});

test("media-edit-persist", async ({ ownerPage: page, mediaItem }) => {
	await reloadReady(page);
	const persisted = await itemData(mediaItem);
	expect(persisted).toBe(cropped);
	expect(persisted).toContain(CAPTION);
	await proof(page, "editor-media-editing", "media-edited");
});
