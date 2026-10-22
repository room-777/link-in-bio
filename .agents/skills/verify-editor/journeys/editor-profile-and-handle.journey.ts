import { FIXTURE_IMAGE } from "../harness/editor.ts";
import { expect, journey } from "../harness/fixtures.ts";
import { reloadReady, settled } from "../harness/journey.ts";
import { db, proof, sql } from "../harness/local.ts";
import { control, exactText, labelled, marker } from "../harness/ui.ts";

const test = journey("editor-profile-and-handle");
const NAME = "Feature map local owner";
const BIO = "Temporary browser verification profile.";
const profileImage = (pageId: string) =>
	db(
		`select coalesce(image_key,'') || '|' || coalesce(image_crop::text,'') from pages where id=${sql(pageId)}`,
	);

test("profile-name-bio", async ({ ownerPage: page, owner }) => {
	const name = control(page, "textbox", "Name");
	const bio = control(page, "textbox", "Bio");
	await name.fill(NAME);
	await name.press("Tab");
	await bio.fill(BIO);
	await bio.press("Tab");
	await settled(page);
	await expect
		.poll(() =>
			db(
				`select coalesce(name,'') || '|' || coalesce(bio,'') from pages where id=${sql(owner.pageId)}`,
			),
		)
		.toBe(`${NAME}|${BIO}`);
});

test("profile-persist", async ({ ownerPage: page }) => {
	await reloadReady(page);
	await expect(control(page, "textbox", "Name")).toHaveValue(NAME);
	await expect(control(page, "textbox", "Bio")).toHaveValue(BIO);
	await proof(page, "editor-profile-and-handle", "profile-saved");
});

test("page-handle-change", async ({ ownerPage: page, owner }) => {
	const moved = `${owner.handle}-moved`;
	await control(page, "button", "Open page options").click();
	await exactText(page, "Change handle").click();
	const dialog = control(page, "dialog");
	await control(dialog, "textbox").fill(moved);
	await expect(labelled(dialog, "Handle available")).toBeVisible();
	await control(dialog, "button", "Change handle").click();
	await expect(page).toHaveURL(new RegExp(`/${moved}$`));
	expect(
		await db(`select handle from pages where id=${sql(owner.pageId)}`),
	).toBe(moved);
});

test("profile-image-upload", async ({ ownerPage: page, owner }) => {
	const chooser = page.waitForEvent("filechooser");
	await control(page, "button", "Change profile image").click();
	await (await chooser).setFiles(FIXTURE_IMAGE);
	await expect
		.poll(() => profileImage(owner.pageId), { timeout: 20_000 })
		.toMatch(/^[^|]+\|/);
	await proof(page, "editor-profile-and-handle", "profile-image-uploaded");
});

test("profile-image-crop", async ({ ownerPage: page, owner }) => {
	await control(page, "button", "Crop profile image").click();
	await expect(marker(page, "data-page-image-crop-open")).toBeVisible();
	const box = await control(
		page,
		"button",
		"Change profile image",
	).boundingBox();
	expect(box, "profile image is on screen").not.toBeNull();
	if (box) {
		await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
		await page.mouse.down();
		await page.mouse.move(
			box.x + box.width / 2 + 18,
			box.y + box.height / 2 + 12,
			{ steps: 8 },
		);
		await page.mouse.up();
	}
	await control(page, "button", "Apply profile image crop").click();
	await settled(page);
	await expect.poll(() => profileImage(owner.pageId)).toMatch(/^[^|]+\|.+/);
});

test("profile-image-remove", async ({ ownerPage: page, owner }) => {
	await control(page, "button", "Change profile image").hover();
	await control(page, "button", "Remove profile image").click();
	await expect
		.poll(() => profileImage(owner.pageId), { timeout: 15_000 })
		.toMatch(/^\|/);
});

test("profile-image-remove-persist", async ({ ownerPage: page, owner }) => {
	await reloadReady(page);
	await expect(marker(page, "data-page-image-crop-open")).toHaveCount(0);
	expect(
		await db(
			`select coalesce(image_key,'') from pages where id=${sql(owner.pageId)}`,
		),
	).toBe("");
});
