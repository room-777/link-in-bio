import type { Page } from "@playwright/test";
import { itemCount, row } from "../harness/editor.ts";
import { expect, journey } from "../harness/fixtures.ts";
import { reloadReady } from "../harness/journey.ts";
import { db, proof, sql } from "../harness/local.ts";
import { control } from "../harness/ui.ts";

const test = journey("editor-tweet");
const TWEET_ID = "1234567890123456789";
let tweetRow = "";
let tweetsBefore = 0;

async function openTweet(page: Page) {
	await control(page, "button", "Advanced").click();
	const catalog = control(page, "dialog", "Advanced widgets");
	await control(catalog, "textbox", "Search widgets").fill("tweet");
	await control(catalog, "button", "Tweet").click();
	return control(page, "dialog", "Tweet");
}

const preview = (page: Page) =>
	page.waitForResponse(
		(response) =>
			response.url().includes("/widgets/preview") &&
			response.request().method() === "POST",
	);

test("tweet-open", async ({ ownerPage: page, owner }) => {
	tweetsBefore = await itemCount(owner.pageId, "tweet");
	const dialog = await openTweet(page);
	await expect(control(dialog, "textbox", "Tweet ID or URL")).toBeVisible();
	await proof(page, "editor-tweet", "tweet-dialog");
});

test("tweet-add", async ({ ownerPage: page, owner }) => {
	const dialog = control(page, "dialog", "Tweet");
	await control(dialog, "textbox", "Tweet ID or URL").fill(
		`https://x.com/featuremap/status/${TWEET_ID}`,
	);
	const loaded = preview(page);
	await control(dialog, "button", "Add").click();
	expect((await loaded).status()).toBe(200);
	tweetRow = await row(
		`select id from page_items where page_id=${sql(owner.pageId)} and type='tweet' and data::text like ${sql(`%${TWEET_ID}%`)}`,
	);
});

test("tweet-persist", async ({ ownerPage: page, owner }) => {
	await reloadReady(page);
	expect(
		await db(
			`select id from page_items where id=${sql(tweetRow)} and page_id=${sql(owner.pageId)} and type='tweet'`,
		),
	).toBe(tweetRow);
	await proof(page, "editor-tweet", "tweet-added");
});

test("tweet-invalid", async ({ ownerPage: page, owner }) => {
	const dialog = await openTweet(page);
	await control(dialog, "textbox", "Tweet ID or URL").fill(
		"https://x.com/featuremap/status/0",
	);
	const loaded = preview(page);
	await control(dialog, "button", "Add").click();
	expect((await loaded).status()).toBe(502);
	await expect(control(dialog, "alert")).toContainText(
		"Could not add this post",
	);
	expect(await itemCount(owner.pageId, "tweet")).toBe(tweetsBefore + 1);
	await proof(page, "editor-tweet", "tweet-invalid");
	await page.keyboard.press("Escape");
});
