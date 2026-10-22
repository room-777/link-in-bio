import {
	addLink,
	addMap,
	addSection,
	addText,
	removeItem,
} from "../harness/editor.ts";
import { expect, journey } from "../harness/fixtures.ts";
import { reloadReady } from "../harness/journey.ts";
import { db, proof, sql } from "../harness/local.ts";

const test = journey("editor-add-item");
const added = { text: "", section: "", link: "", map: "" };
const saved = (pageId: string, id: string, type: string) =>
	db(
		`select id from page_items where id=${sql(id)} and page_id=${sql(pageId)} and type=${sql(type)}`,
	);

test("add-text", async ({ ownerPage: page, owner }) => {
	added.text = await addText(page, owner.pageId, "Feature map temporary text");
	await proof(page, "editor-add-item", "text-added");
});

test("add-section", async ({ ownerPage: page, owner }) => {
	added.section = await addSection(page, owner.pageId, "Feature map section");
});

test("add-link", async ({ ownerPage: page, owner }) => {
	added.link = await addLink(
		page,
		owner.pageId,
		"https://example.com/featuremap-metadata",
	);
});

test("add-map", async ({ ownerPage: page, owner }) => {
	added.map = await addMap(page, owner.pageId);
});

test("item-persist", async ({ ownerPage: page, owner }) => {
	await reloadReady(page);
	expect(await saved(owner.pageId, added.text, "text")).toBe(added.text);
});

test("section-persist", async ({ owner }) => {
	expect(await saved(owner.pageId, added.section, "section")).toBe(
		added.section,
	);
});

test("link-persist", async ({ owner }) => {
	expect(await saved(owner.pageId, added.link, "link")).toBe(added.link);
});

test("map-persist", async ({ owner }) => {
	expect(await saved(owner.pageId, added.map, "map")).toBe(added.map);
});

test("delete-item", async ({ ownerPage: page, owner }) => {
	await removeItem(page, owner.pageId, added.map);
});
