import path from "node:path";
import { expect, type Page } from "@playwright/test";
import { settled } from "./journey.ts";
import { db, ROOT, sql } from "./local.ts";
import { control, item } from "./ui.ts";

export const FIXTURE_IMAGE = path.join(
	ROOT,
	"apps/web/public/images/landing/hero-profile-preview-6c812da2.webp",
);
export const REPLACEMENT_IMAGE = path.join(
	ROOT,
	"apps/web/public/images/kofi-support.png",
);

/** Polls a query until it returns a non-empty value, then returns that value. */
export async function row(query: string, timeout = 15_000): Promise<string> {
	let value = "";
	await expect
		.poll(
			async () => {
				value = await db(query);
				return value;
			},
			{ message: `no row for: ${query}`, timeout },
		)
		.not.toBe("");
	return value;
}

export const itemData = (id: string) =>
	db(`select data::text from page_items where id=${sql(id)}`);

export const itemCount = (pageId: string, type: string) =>
	db(
		`select count(*) from page_items where page_id=${sql(pageId)} and type=${sql(type)}`,
	).then(Number);

const newestItem = (pageId: string, type: string, marker = "") =>
	`select id from page_items where page_id=${sql(pageId)} and type=${sql(type)} and data::text like ${sql(`%${marker}%`)} order by created_at desc limit 1`;

export async function addText(page: Page, pageId: string, content: string) {
	// The toolbar can render before its editor effect registers add actions.
	await settled(page);
	await control(page, "button", "Add text").click();
	const input = control(page, "textbox", "Text content").last();
	await input.fill(content);
	await input.press("Tab");
	await settled(page);
	return row(newestItem(pageId, "text", content));
}

export async function addSection(page: Page, pageId: string, title: string) {
	await control(page, "button", "Add section").click();
	const input = control(page, "textbox", "Section title").last();
	await input.fill(title);
	await input.press("Tab");
	await settled(page);
	return row(newestItem(pageId, "section", title));
}

export async function addLink(page: Page, pageId: string, url: string) {
	await settled(page);
	await control(page, "button", "Add link").click();
	const input = control(page, "textbox", "Link URL").last();
	await input.fill(url);
	await input.press("Enter");
	await settled(page);
	return row(newestItem(pageId, "link", new URL(url).pathname.slice(1)));
}

export async function addMap(page: Page, pageId: string) {
	await control(page, "button", "Add map").click();
	await settled(page);
	return row(newestItem(pageId, "map"));
}

export async function addMedia(page: Page, pageId: string) {
	await settled(page);
	const chooser = page.waitForEvent("filechooser");
	await control(page, "button", "Add media").click();
	await (await chooser).setFiles(FIXTURE_IMAGE);
	const id = await row(newestItem(pageId, "media"), 20_000);
	await expect(item(page, id)).toBeVisible();
	return id;
}

/** Deletes an item through its card and waits for the saved row to go. */
export async function removeItem(page: Page, pageId: string, id: string) {
	await control(item(page, id), "button", "Delete item").click();
	await expect
		.poll(
			() =>
				db(
					`select count(*) from page_items where id=${sql(id)} and page_id=${sql(pageId)}`,
				),
			{ timeout: 20_000 },
		)
		.toBe("0");
}
