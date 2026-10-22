import { expect, journey } from "../harness/fixtures.ts";
import { reloadReady, settled } from "../harness/journey.ts";
import { db, proof, sql } from "../harness/local.ts";
import { control, item } from "../harness/ui.ts";

const test = journey("editor-layout");
const layouts = (id: string) =>
	db(`select layouts::text from page_items where id=${sql(id)}`);
let beforeDrag = "";
let afterDrag = "";

test("layout-compact", async ({ ownerPage: page }) => {
	const compact = control(page, "tab", "Edit compact layout");
	await compact.click();
	await settled(page);
	await expect(compact).toHaveAttribute("aria-selected", "true");
	await proof(page, "editor-layout", "compact-layout-selected");
});

test("layout-wide", async ({ ownerPage: page }) => {
	const wide = control(page, "tab", "Edit wide layout");
	await wide.click();
	await settled(page);
	await expect(wide).toHaveAttribute("aria-selected", "true");
	await proof(page, "editor-layout", "wide-layout-selected");
});

test("layout-drag", async ({ ownerPage: page, textItem }) => {
	const card = item(page, textItem);
	beforeDrag = await layouts(textItem);
	const before = await card.boundingBox();
	expect(before, "a visible card to drag").not.toBeNull();
	if (!before) return;
	await page.mouse.move(before.x + 5, before.y + 5);
	await page.mouse.down();
	await page.mouse.move(before.x + 183, before.y + 183, { steps: 16 });
	await page.mouse.up();
	await settled(page);
	await expect.poll(() => layouts(textItem)).not.toBe(beforeDrag);
	const after = await card.boundingBox();
	expect(after?.x !== before.x || after?.y !== before.y).toBe(true);
	afterDrag = await layouts(textItem);
});

test("layout-persist", async ({ ownerPage: page, textItem }) => {
	await reloadReady(page);
	expect(await layouts(textItem)).toBe(afterDrag);
});

test("layout-preset", async ({ ownerPage: page, textItem }) => {
	const preset = control(item(page, textItem), "button", "Full square");
	await preset.click();
	await settled(page);
	await expect.poll(() => layouts(textItem)).not.toBe(afterDrag);
	await proof(page, "editor-layout", "layout-state");
});
