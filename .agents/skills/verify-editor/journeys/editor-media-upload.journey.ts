import {
	FIXTURE_IMAGE,
	itemCount,
	itemData,
	REPLACEMENT_IMAGE,
	row,
} from "../harness/editor.ts";
import { expect, journey } from "../harness/fixtures.ts";
import { reloadReady } from "../harness/journey.ts";
import { API, db, proof, sql } from "../harness/local.ts";
import { blobPreview, control, item, items } from "../harness/ui.ts";

const test = journey("editor-media-upload");
let mediaId = "";

test("media-add", async ({ ownerPage: page, owner }) => {
	const chooser = page.waitForEvent("filechooser");
	await control(page, "button", "Add media").click();
	await (await chooser).setFiles(FIXTURE_IMAGE);
	mediaId = await row(
		`select id from page_items where page_id=${sql(owner.pageId)} and type='media' order by created_at desc limit 1`,
		20_000,
	);
	await expect(item(page, mediaId)).toBeVisible();
	await proof(page, "editor-media-upload", "media-picker-open");
});

test("media-upload", async ({ ownerPage: page }) => {
	const data = JSON.parse(await itemData(mediaId)) as {
		objectKey?: string;
		mediaUrl?: string;
	};
	expect(data.objectKey, "uploaded object key").toBeTruthy();
	const url = data.mediaUrl ?? `${API}/media/${data.objectKey}`;
	expect(url.startsWith(API), "media served by the local API").toBe(true);
	expect((await page.context().request.get(url)).status()).toBe(200);
	await proof(page, "editor-media-upload", "media-uploaded");
});

test("media-upload-persist", async ({ ownerPage: page, owner }) => {
	await reloadReady(page);
	expect(
		await db(
			`select id from page_items where id=${sql(mediaId)} and page_id=${sql(owner.pageId)} and type='media'`,
		),
	).toBe(mediaId);
	await expect(item(page, mediaId)).toBeVisible();
});

test("media-cancel", async ({ ownerPage: page, owner }) => {
	const mediaBefore = await itemCount(owner.pageId, "media");
	let release = () => {};
	const held = new Promise<void>((resolve) => {
		release = resolve;
	});
	let markPutHeld = () => {};
	const putHeld = new Promise<void>((resolve) => {
		markPutHeld = resolve;
	});
	await page.route(`${API}/media/**`, async (route) => {
		if (route.request().method() !== "PUT") return route.continue();
		markPutHeld();
		await held;
		await route.abort("aborted").catch(() => {});
	});
	const uploadCreated = page.waitForResponse(
		(response) =>
			response.url() === `${API}/pages/${owner.handle}/items/upload` &&
			response.request().method() === "POST",
	);
	const chooser = page.waitForEvent("filechooser");
	await control(page, "button", "Add media").click();
	await (await chooser).setFiles(REPLACEMENT_IMAGE);
	await expect(blobPreview(items(page)).first()).toBeVisible();
	const pending = items(page).last();
	const pendingId = (await pending.getAttribute("data-bento-item-id")) ?? "";
	// The pending card has no page_items row until its upload finishes, so
	// its object key comes from the upload URL response.
	const pendingKey =
		((await (await uploadCreated).json()) as { objectKey?: string })
			.objectKey ?? "";
	expect(pendingKey, "upload URL response names the object").not.toBe("");
	// Cancel while the storage PUT is provably held, then let it go, so the
	// order is upload created -> PUT held -> cancel -> PUT aborted.
	await putHeld;
	const cancelled = page.waitForResponse(
		(response) =>
			response.url() === `${API}/pages/${owner.handle}/items/upload/cancel` &&
			response.request().method() === "POST",
	);
	await control(pending, "button", "Delete item").click();
	expect((await cancelled).status()).toBe(204);
	release();
	await page.unroute(`${API}/media/**`);
	await expect
		.poll(
			() => db(`select count(*) from page_items where id=${sql(pendingId)}`),
			{
				timeout: 20_000,
			},
		)
		.toBe("0");
	expect(await itemCount(owner.pageId, "media")).toBe(mediaBefore);
	await expect
		.poll(
			() =>
				db(
					`select status||':'||(delete_after > now())::text from page_media_assets where object_key=${sql(pendingKey)}`,
				),
			{ timeout: 15_000 },
		)
		.toBe("pending_delete:true");
	await proof(page, "editor-media-upload", "media-cancelled");
});
