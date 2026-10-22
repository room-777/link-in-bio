import { addMap, itemData } from "../harness/editor.ts";
import { expect, journey } from "../harness/fixtures.ts";
import { settled } from "../harness/journey.ts";
import { proof } from "../harness/local.ts";
import { content, control, item } from "../harness/ui.ts";

const test = journey("editor-map-editing");
let mapId = "";

test("map-add", async ({ ownerPage: page, owner }) => {
	mapId = await addMap(page, owner.pageId);
});

test("map-visible", async ({ ownerPage: page }) => {
	// Mapbox renders its region after the map scrolls into view and loads.
	const map = item(page, mapId);
	await map.scrollIntoViewIfNeeded();
	await expect(control(map, "region", "Map")).toBeVisible({ timeout: 15_000 });
	await proof(page, "editor-map-editing", "map-added");
});

test("map-search", async ({ ownerPage: page }) => {
	const before = await itemData(mapId);
	await control(item(page, mapId), "button", "Search location").click();
	await control(page, "combobox", "Search location").fill("Seattle");
	await content(page, "option", "Local Test Place").click();
	await settled(page);
	await expect.poll(() => itemData(mapId)).not.toBe(before);
	expect(await itemData(mapId)).toMatch(/latitude|longitude|place|location/i);
	await proof(page, "editor-map-editing", "map-search-result");
});
