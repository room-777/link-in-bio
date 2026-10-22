import { expect, journey } from "../harness/fixtures.ts";
import { reloadReady, settled } from "../harness/journey.ts";
import { db, proof, sql } from "../harness/local.ts";
import { control, item } from "../harness/ui.ts";

const test = journey("editor-text-formatting");
const savedRow = (id: string) =>
	db(
		`select data::text || '|' || style::text from page_items where id=${sql(id)}`,
	);
let formatted = "";

test("text-content-edit", async ({ ownerPage: page, textItem }) => {
	await control(item(page, textItem), "textbox", "Text content").fill(
		"Feature map formatted text",
	);
	await settled(page);
	await expect
		.poll(() => savedRow(textItem))
		.toContain("Feature map formatted text");
});

test("text-align", async ({ ownerPage: page, textItem }) => {
	await control(
		item(page, textItem),
		"button",
		"Open text style options",
	).click();
	const center = control(page, "button", "Align text center");
	await center.click();
	await expect(center).toHaveAttribute("aria-pressed", "true");
});

test("text-vertical-align", async ({ ownerPage: page }) => {
	const bottom = control(page, "button", "Align text to the bottom");
	await bottom.click();
	await expect(bottom).toHaveAttribute("aria-pressed", "true");
});

test("text-background", async ({ ownerPage: page, textItem }) => {
	await control(page, "button", "Toggle text background color options").click();
	await control(page, "radio", "Blue").click();
	const custom = control(page, "textbox", "Text background hex color");
	await custom.fill("#123abc");
	await custom.press("Enter");
	await settled(page);
	await expect
		.poll(async () => (await savedRow(textItem)).toLowerCase())
		.toContain("#123abc");
	formatted = await savedRow(textItem);
});

test("text-format-persist", async ({ ownerPage: page, textItem }) => {
	await reloadReady(page);
	expect(await savedRow(textItem)).toBe(formatted);
	await proof(page, "editor-text-formatting", "formatted-text");
});
