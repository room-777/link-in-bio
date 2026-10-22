import { itemData } from "../harness/editor.ts";
import { expect, journey } from "../harness/fixtures.ts";
import { reloadReady, settled } from "../harness/journey.ts";
import { proof } from "../harness/local.ts";
import { control, item } from "../harness/ui.ts";

const test = journey("editor-link-metadata");

test("link-add", async ({ ownerPage: page, linkItem }) => {
	await expect(item(page, linkItem)).toBeVisible();
	expect(await itemData(linkItem)).toContain("featuremap-metadata");
});

let refreshStatus = 0;

test("link-metadata", async ({ ownerPage: page, linkItem }) => {
	await control(item(page, linkItem), "button", "Edit link URL").click();
	const refreshed = page.waitForResponse((response) =>
		response.url().includes("metadata"),
	);
	await control(page, "button", "Refresh link metadata").click();
	refreshStatus = (await refreshed).status();
	await settled(page);
	await expect.poll(() => itemData(linkItem)).toMatch(/title|description/);
});

test("link-metadata-refresh", async () => {
	expect(refreshStatus).toBe(200);
});

test("link-persist", async ({ ownerPage: page, linkItem }) => {
	await reloadReady(page);
	expect(await itemData(linkItem)).toContain("featuremap-metadata");
	await proof(page, "editor-link-metadata", "link-details");
});
