import { execFileSync } from "node:child_process";
import {
	expect,
	type Locator,
	type Page,
	type Response,
	test,
} from "@playwright/test";

const handle = "featuremap-test";

function sql(statement: string) {
	return execFileSync(
		"docker",
		[
			"exec",
			"grabbin-featuremap-postgres",
			"psql",
			"-X",
			"-v",
			"ON_ERROR_STOP=1",
			"-U",
			"postgres",
			"-d",
			"postgres",
			"-Atc",
			statement,
		],
		{ encoding: "utf8" },
	).trim();
}

async function openOwner(page: Page) {
	watchSaves(page);
	await page.goto(`/${handle}`, { waitUntil: "networkidle" });
	await expect(
		page.getByRole("group", { name: "Page editor toolbar" }),
	).toBeVisible();
	return {
		toolbar: page.getByRole("group", { name: "Page editor toolbar" }),
		content: page.getByRole("region", { name: "Page content" }),
	};
}

const saveQueues = new WeakMap<
	Page,
	{ pending: Response[]; waiters: ((response: Response) => void)[] }
>();

function watchSaves(page: Page) {
	const queue: {
		pending: Response[];
		waiters: ((response: Response) => void)[];
	} = {
		pending: [],
		waiters: [],
	};
	saveQueues.set(page, queue);
	page.on("response", (response) => {
		const url = new URL(response.url());
		if (
			response.request().method() !== "PATCH" ||
			!(
				url.pathname === `/pages/${handle}` ||
				url.pathname === `/pages/${handle}/batch`
			)
		)
			return;
		const waiter = queue.waiters.shift();
		if (waiter) waiter(response);
		else queue.pending.push(response);
	});
}

async function waitForSave(page: Page) {
	const queue = saveQueues.get(page);
	if (!queue) throw new Error("save response watcher was not started");
	const response =
		queue.pending.shift() ??
		(await new Promise<Response>((resolve) => queue.waiters.push(resolve)));
	expect(response.ok()).toBe(true);
}

async function deleteItem(shell: Locator) {
	const itemId = await shell.getAttribute("data-bento-item-id");
	await shell.hover();
	await shell.getByRole("button", { name: "Delete item" }).click();
	if (itemId) {
		await expect
			.poll(() => sql(`select count(*) from page_items where id='${itemId}'`))
			.toBe("0");
	}
}

test.beforeEach(async ({ page }) => {
	await page.route("https://example.com/**", (route) =>
		route.fulfill({
			path: ".agents/skills/verify-editor/tests/test-fixtures/feature-map-64.png",
			contentType: "image/png",
		}),
	);
	await page.route(
		/^https:\/\/(?:api|events)\.mapbox\.com\//,
		async (route) => {
			const url = new URL(route.request().url());
			if (url.pathname === "/search/geocode/v6/forward") {
				return route.fulfill({
					json: {
						features: [
							{
								id: "featuremap-seoul",
								geometry: { type: "Point", coordinates: [126.978, 37.5665] },
								properties: {
									mapbox_id: "featuremap-seoul",
									name: "Seoul",
									place_formatted: "South Korea",
								},
							},
						],
					},
				});
			}
			if (url.pathname.startsWith("/styles/v1/")) {
				return route.fulfill({
					json: {
						version: 8,
						sources: {},
						layers: [
							{
								id: "background",
								type: "background",
								paint: { "background-color": "#eeeeee" },
							},
						],
					},
				});
			}
			return route.fulfill({ status: 204 });
		},
	);
});

test("editor-add-item: add, save, reload, and delete a text item", async ({
	page,
}) => {
	const { toolbar, content } = await openOwner(page);
	const before = sql(
		`select coalesce(string_agg(type || ':' || n, ',' order by type), '') from (select type, count(*) n from page_items where page_id=(select id from pages where handle='${handle}') group by type) items`,
	);
	await toolbar.getByRole("button", { name: "Add text" }).click();
	const textbox = content.getByRole("textbox", { name: "Text content" }).last();
	await textbox.fill("Playwright feature map text");
	await toolbar.getByRole("button", { name: "Add section" }).click();
	await content
		.getByRole("textbox", { name: "Section title" })
		.last()
		.fill("Playwright feature map section");
	await toolbar.getByRole("button", { name: "Add link" }).click();
	const linkUrl = page.getByRole("textbox", { name: "Link URL" }).last();
	await linkUrl.fill("https://example.com/feature-map-add-item");
	await linkUrl.press("Enter");
	await waitForSave(page);
	await page.reload({ waitUntil: "networkidle" });
	const textId = sql(
		`select id from page_items where page_id=(select id from pages where handle='${handle}') and type='text' and data->>'text'='Playwright feature map text' order by created_at desc limit 1`,
	);
	const sectionId = sql(
		`select id from page_items where page_id=(select id from pages where handle='${handle}') and type='section' and data->>'title'='Playwright feature map section' order by created_at desc limit 1`,
	);
	const linkId = sql(
		`select id from page_items where page_id=(select id from pages where handle='${handle}') and type='link' and data->>'url'='https://example.com/feature-map-add-item' order by created_at desc limit 1`,
	);
	for (const id of [textId, sectionId, linkId]) expect(id).not.toBe("");
	const textShell = page.locator(`[data-bento-item-id="${textId}"]`);
	const sectionShell = page.locator(`[data-bento-item-id="${sectionId}"]`);
	const linkShell = page.locator(`[data-bento-item-id="${linkId}"]`);
	await expect(
		textShell.getByRole("textbox", { name: "Text content" }),
	).toHaveValue("Playwright feature map text");
	await expect(
		sectionShell.getByRole("textbox", { name: "Section title" }),
	).toHaveValue("Playwright feature map section");
	await expect(
		linkShell.locator('a[href="https://example.com/feature-map-add-item"]'),
	).toBeVisible();
	for (const id of [textId, sectionId, linkId])
		expect(sql(`select count(*) from page_items where id='${id}'`)).toBe("1");
	await deleteItem(textShell);
	await deleteItem(sectionShell);
	await deleteItem(linkShell);
	await waitForSave(page);
	const after = sql(
		`select coalesce(string_agg(type || ':' || n, ',' order by type), '') from (select type, count(*) n from page_items where page_id=(select id from pages where handle='${handle}') group by type) items`,
	);
	expect(after).toBe(before);
});

test("editor-inline-destination-url: a text card opens and keeps its optional destination", async ({
	page,
}) => {
	const { toolbar, content } = await openOwner(page);
	await toolbar.getByRole("button", { name: "Add text" }).click();
	const text = content.getByRole("textbox", { name: "Text content" }).last();
	await text.fill("Destination link test");
	const shell = text.locator("xpath=ancestor::*[@data-bento-item-id][1]");
	const itemId = await shell.getAttribute("data-bento-item-id");
	if (!itemId) throw new Error("text item has no id");
	await shell.hover();
	await shell.getByRole("button", { name: "Add text link" }).click();
	const destination = page.getByRole("textbox", { name: "Link URL" }).last();
	await destination.fill("https://example.com/feature-map");
	await destination.press("Enter");
	await waitForSave(page);
	await page.reload({ waitUntil: "networkidle" });
	const link = page.locator('a[href="https://example.com/feature-map"]');
	await expect(link).toHaveAttribute("href", "https://example.com/feature-map");
	const saved = page.locator(`[data-bento-item-id="${itemId}"]`);
	await saved.hover();
	await saved.getByRole("button", { name: "Edit text link" }).click();
	const edited = page.getByRole("textbox", { name: "Link URL" }).last();
	await edited.fill("not a url");
	await page.keyboard.press("Tab");
	await expect(edited).toHaveAttribute("aria-invalid", "true");
	await expect(
		saved.locator('a[href="https://example.com/feature-map"]'),
	).toBeVisible();
	await edited.fill("");
	await edited.press("Enter");
	await waitForSave(page);
	await page.reload({ waitUntil: "networkidle" });
	expect(
		sql(
			`select coalesce(data->>'url', '') from page_items where id='${itemId}'`,
		),
	).toBe("");
	await deleteItem(page.locator(`[data-bento-item-id="${itemId}"]`));
});

test("editor-advanced-widgets: search, open, return, and close the widget catalog", async ({
	page,
}) => {
	const { toolbar } = await openOwner(page);
	await toolbar.getByRole("button", { name: "Advanced" }).click();
	let dialog = page.getByRole("dialog", { name: "Advanced widgets" });
	await expect(dialog.getByRole("button", { name: "Spotify" })).toBeVisible();
	await expect(dialog.getByRole("button", { name: "RSS Feed" })).toBeVisible();
	await expect(dialog.getByRole("button", { name: "Calendly" })).toBeVisible();
	await expect(dialog.getByRole("button", { name: "Tweet" })).toBeVisible();
	await dialog.getByRole("textbox", { name: "Search widgets" }).fill("spotify");
	await dialog.getByRole("button", { name: "Spotify" }).click();
	await expect(page.getByRole("heading", { name: "Spotify" })).toBeVisible();
	await page.getByRole("button", { name: "Back to widgets" }).click();
	await expect(dialog.getByRole("button", { name: "Spotify" })).toBeVisible();
	await page.keyboard.press("Escape");
	await expect(dialog).toBeHidden();
	await toolbar.getByRole("button", { name: "Advanced" }).click();
	dialog = page.getByRole("dialog", { name: "Advanced widgets" });
	await dialog.getByRole("button", { name: "Signature" }).click();
	await expect(
		page.getByText("Sipping coffee while crafting a polished widget..."),
	).toBeVisible();
	await page.keyboard.press("Escape");
});

test("editor-advanced-widgets: mobile drawer, empty search, and coming-soon details work", async ({
	page,
}) => {
	await page.setViewportSize({ width: 390, height: 844 });
	const { toolbar } = await openOwner(page);
	await toolbar.getByRole("button", { name: "Advanced" }).click();
	let dialog = page.getByRole("dialog", { name: "Advanced widgets" });
	await expect(dialog.getByRole("button", { name: "RSS Feed" })).toBeVisible();
	const search = dialog.getByRole("textbox", { name: "Search widgets" });
	await search.fill("no matching widget");
	await expect(dialog.getByText("No widgets found.")).toBeVisible();
	await search.fill("");
	await dialog.getByRole("button", { name: "SoundCloud" }).click();
	await expect(
		page.getByText("Sipping coffee while crafting a polished widget..."),
	).toBeVisible();
	await page.getByRole("button", { name: "Back to widgets" }).click();
	dialog = page.getByRole("dialog", { name: "Advanced widgets" });
	await dialog.getByRole("button", { name: "Apple Music" }).click();
	await expect(
		page.getByText("Sipping coffee while crafting a polished widget..."),
	).toBeVisible();
	await page.keyboard.press("Escape");
	await expect(dialog).toBeHidden();
});

test("editor-page-sharing: the share dialog shows a page link and QR code", async ({
	page,
}) => {
	await page.addInitScript(() => {
		const state = window as Window & {
			__gaCalls?: unknown[][];
			gtag?: (...args: unknown[]) => void;
		};
		state.__gaCalls = JSON.parse(
			localStorage.getItem("feature-map-ga-calls") ?? "[]",
		);
		state.gtag = (...args) => {
			state.__gaCalls ??= [];
			state.__gaCalls.push(args);
			localStorage.setItem(
				"feature-map-ga-calls",
				JSON.stringify(state.__gaCalls),
			);
		};
	});
	await openOwner(page);
	await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
	await page.getByRole("button", { name: "Share page" }).click();
	const dialog = page.getByRole("dialog", { name: "Share your page" });
	await expect(dialog).toBeVisible();
	await expect(
		dialog.getByRole("img", { name: "QR code for your page" }),
	).toBeVisible();
	await expect(dialog.getByRole("button", { name: /Copy/ })).toBeVisible();
	await dialog.getByRole("button", { name: "Copy Link" }).click();
	await expect(
		dialog.getByRole("button", { name: "Copied Link" }),
	).toBeVisible();
	expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
		page.url(),
	);
	await expect
		.poll(() =>
			page.evaluate(() => {
				const state = window as Window & { __gaCalls?: unknown[][] };
				return (state.__gaCalls ?? []).some(
					([kind, name]) => kind === "event" && name === "profile_share",
				);
			}),
		)
		.toBe(true);
	await page.keyboard.press("Escape");
});

test("editor-page-sharing: the mobile share control opens the same QR dialog", async ({
	page,
}) => {
	await page.setViewportSize({ width: 390, height: 844 });
	await openOwner(page);
	await page.getByRole("button", { name: "Share link" }).click();
	const dialog = page.getByRole("dialog", { name: "Share your page" });
	await expect(
		dialog.getByRole("img", { name: "QR code for your page" }),
	).toBeVisible();
});

test("analytics-events: public link clicks send a safe click event", async ({
	page,
	browser,
}) => {
	const { toolbar } = await openOwner(page);
	await toolbar.getByRole("button", { name: "Add link" }).click();
	const url = page.getByRole("textbox", { name: "Link URL" }).last();
	await url.fill("https://example.com/feature-map-analytics");
	await url.press("Enter");
	await waitForSave(page);
	const itemId = sql(
		`select id from page_items where page_id=(select id from pages where handle='${handle}') and data->>'url'='https://example.com/feature-map-analytics' order by created_at desc limit 1`,
	);
	expect(itemId).not.toBe("");
	const visitor = await browser.newContext({
		storageState: { cookies: [], origins: [] },
	});
	try {
		await visitor.addInitScript(() => {
			const state = window as Window & {
				__gaCalls?: unknown[][];
				gtag?: (...args: unknown[]) => void;
			};
			state.__gaCalls = JSON.parse(
				localStorage.getItem("feature-map-ga-calls") ?? "[]",
			);
			state.gtag = (...args) => {
				state.__gaCalls ??= [];
				state.__gaCalls.push(args);
				localStorage.setItem(
					"feature-map-ga-calls",
					JSON.stringify(state.__gaCalls),
				);
			};
		});
		const publicPage = await visitor.newPage();
		await publicPage.goto(`http://127.0.0.1:3000/${handle}`, {
			waitUntil: "networkidle",
		});
		const link = publicPage.locator(
			'[data-bento-item-id="' +
				itemId +
				'"] a[href="https://example.com/feature-map-analytics"]',
		);
		await expect(link).toBeVisible();
		const [popup] = await Promise.all([
			publicPage.waitForEvent("popup"),
			link.click(),
		]);
		await popup.close();
		await expect
			.poll(() =>
				publicPage.evaluate(() => {
					const state = window as Window & { __gaCalls?: unknown[][] };
					return (state.__gaCalls ?? []).some(
						([kind, name, params]) =>
							kind === "event" &&
							name === "profile_link_click" &&
							typeof params === "object" &&
							params !== null &&
							"item_type" in params &&
							params.item_type === "link" &&
							"link_position" in params &&
							typeof params.link_position === "number" &&
							params.link_position > 0,
					);
				}),
			)
			.toBe(true);
	} finally {
		await visitor.close();
		await deleteItem(page.locator(`[data-bento-item-id="${itemId}"]`));
	}
});

test("analytics-events: social login, GA collection, checkout, and purchase require external test accounts", async () => {
	test.skip(
		true,
		"Social providers, GA collection, and Creem checkout require dedicated external test accounts; local CI must not send production analytics or payments.",
	);
});

test("editor-link-metadata: editing a URL keeps the card's new destination", async ({
	page,
}) => {
	const { toolbar, content } = await openOwner(page);
	await toolbar.getByRole("button", { name: "Add link" }).click();
	const entry = page.getByRole("textbox", { name: "Link URL" }).last();
	await entry.fill("https://github.com/microsoft/playwright");
	await entry.press("Enter");
	await expect(
		content.getByRole("textbox", { name: "Link title" }).last(),
	).toBeVisible();
	await waitForSave(page);
	const itemId = sql(
		`select id from page_items where page_id=(select id from pages where handle='${handle}') and data->>'url'='https://github.com/microsoft/playwright' order by created_at desc limit 1`,
	);
	sql(
		`update page_items set data=jsonb_set(coalesce(data, '{}'::jsonb), '{metadata}', jsonb_set(coalesce(data->'metadata', '{}'::jsonb), '{title}', '"Old title"'::jsonb, true), true) where id='${itemId}'`,
	);
	await page.reload({ waitUntil: "networkidle" });
	const shell = content.locator(`[data-bento-item-id="${itemId}"]`);
	await shell.hover();
	await shell.getByRole("button", { name: "Edit link URL" }).click();
	const refresh = page.waitForResponse((response) => {
		const url = new URL(response.url());
		return (
			url.pathname === `/pages/${handle}/metadata` &&
			response.request().method() === "POST"
		);
	});
	await page.getByRole("button", { name: "Refresh link metadata" }).click();
	expect((await refresh).ok()).toBe(true);
	await page.reload({ waitUntil: "networkidle" });
	expect(
		sql(
			`select data->'metadata'->>'title' from page_items where id='${itemId}'`,
		),
	).not.toBe("Old title");
	await deleteItem(page.locator(`[data-bento-item-id="${itemId}"]`));
});

test("editor-layout: compact and wide layout controls are available to the owner", async ({
	page,
}) => {
	const { toolbar } = await openOwner(page);
	await expect(
		toolbar.getByRole("tab", { name: "Edit compact layout" }),
	).toBeVisible();
	await expect(
		toolbar.getByRole("tab", { name: "Edit wide layout" }),
	).toBeVisible();
	await toolbar.getByRole("tab", { name: "Edit compact layout" }).click();
	await expect(
		toolbar.getByRole("tab", { name: "Edit compact layout" }),
	).toHaveAttribute("aria-selected", "true");
	await toolbar.getByRole("tab", { name: "Edit wide layout" }).click();
	await expect(
		toolbar.getByRole("tab", { name: "Edit wide layout" }),
	).toHaveAttribute("aria-selected", "true");
});

test("editor-layout: dragging a card saves its position in the active layout", async ({
	page,
}) => {
	const { toolbar, content } = await openOwner(page);
	await toolbar.getByRole("tab", { name: "Edit wide layout" }).click();
	await toolbar.getByRole("button", { name: "Add text" }).click();
	const first = content.getByRole("textbox", { name: "Text content" }).last();
	await first.fill("Playwright drag source");
	const firstShell = first.locator("xpath=ancestor::*[@data-bento-item-id][1]");
	const firstId = await firstShell.getAttribute("data-bento-item-id");
	if (!firstId) throw new Error("drag source item has no id");
	await toolbar.getByRole("button", { name: "Add text" }).click();
	const second = content.getByRole("textbox", { name: "Text content" }).last();
	await second.fill("Playwright drag target");
	const secondShell = second.locator(
		"xpath=ancestor::*[@data-bento-item-id][1]",
	);
	const secondId = await secondShell.getAttribute("data-bento-item-id");
	if (!secondId) throw new Error("drag target item has no id");
	const before = sql(
		`select (layouts->'wide')::text from page_items where id='${firstId}'`,
	);
	const box = await firstShell.boundingBox();
	if (!box) throw new Error("drag source item has no visible bounds");
	await page.mouse.move(box.x + 5, box.y + 5);
	await page.mouse.down();
	await page.mouse.move(box.x + 245, box.y + 145, { steps: 12 });
	await page.mouse.up();
	await expect
		.poll(() =>
			sql(
				`select (layouts->'wide')::text from page_items where id='${firstId}'`,
			),
		)
		.not.toBe(before);
	await page.reload({ waitUntil: "networkidle" });
	expect(
		sql(`select (layouts->'wide')::text from page_items where id='${firstId}'`),
	).not.toBe(before);
	await deleteItem(page.locator(`[data-bento-item-id="${firstId}"]`));
	await deleteItem(page.locator(`[data-bento-item-id="${secondId}"]`));
});

test("editor-layout: a size preset persists after reload", async ({ page }) => {
	const { toolbar, content } = await openOwner(page);
	await toolbar.getByRole("button", { name: "Add text" }).click();
	const text = content.getByRole("textbox", { name: "Text content" }).last();
	await text.fill("Playwright layout preset");
	const shell = text.locator("xpath=ancestor::*[@data-bento-item-id][1]");
	const itemId = await shell.getAttribute("data-bento-item-id");
	if (!itemId) throw new Error("layout item has no id");
	await shell.hover();
	const beforeLayout = sql(
		`select (layouts->'wide')::text from page_items where id='${itemId}'`,
	);
	await shell.getByRole("button", { name: "Wide" }).click();
	await expect(shell).toHaveAttribute("data-bento-item-preset", "landscape");
	await waitForSave(page);
	await page.reload({ waitUntil: "networkidle" });
	const saved = page.locator(`[data-bento-item-id="${itemId}"]`);
	await expect(saved).toHaveAttribute("data-bento-item-preset", "landscape");
	expect(
		sql(`select (layouts->'wide')::text from page_items where id='${itemId}'`),
	).not.toBe(beforeLayout);
	await deleteItem(saved);
});

test("editor-profile-and-handle: profile fields save and can be restored", async ({
	page,
}) => {
	await openOwner(page);
	const name = page.getByRole("textbox", { name: "Name" });
	const bio = page.getByRole("textbox", { name: "Bio" });
	const originalName = await name.inputValue();
	const originalBio = await bio.inputValue();
	try {
		await name.fill("Playwright Profile Check");
		await bio.fill("Profile changes saved by the feature map test.");
		await waitForSave(page);
		await expect
			.poll(() =>
				sql(
					`select name || '|' || coalesce(bio, '') from pages where handle='${handle}'`,
				),
			)
			.toBe(
				"Playwright Profile Check|Profile changes saved by the feature map test.",
			);
		await page.reload({ waitUntil: "networkidle" });
		await expect(page.getByRole("textbox", { name: "Name" })).toHaveValue(
			"Playwright Profile Check",
		);
		await expect(page.getByRole("textbox", { name: "Bio" })).toHaveValue(
			"Profile changes saved by the feature map test.",
		);
	} finally {
		await page.getByRole("textbox", { name: "Name" }).fill(originalName);
		await page.getByRole("textbox", { name: "Bio" }).fill(originalBio);
		await waitForSave(page);
	}
});

test("editor-profile-and-handle: change to an available handle and restore the fixture URL", async ({
	page,
}) => {
	await openOwner(page);
	const nextHandle = `featuremap-ci-${process.env.GITHUB_RUN_ID ?? "local"}`;
	const openOptions = async () => {
		await page.getByRole("button", { name: "Open page options" }).click();
		await page.getByRole("button", { name: /Change handle/ }).click();
	};
	const change = async (value: string) => {
		await openOptions();
		const field = page.getByRole("textbox", { name: "Handle" });
		const available = page.waitForResponse((response) => {
			const url = new URL(response.url());
			return (
				url.pathname === "/pages/check" &&
				url.searchParams.get("handle") === value
			);
		});
		await field.fill(value);
		const response = await available;
		expect(response.ok()).toBe(true);
		expect(await response.json()).toMatchObject({ available: true });
		await page.getByRole("button", { name: "Change handle" }).click();
		await page.waitForURL(`**/${value}`);
	};
	try {
		await change(nextHandle);
		expect(sql(`select count(*) from pages where handle='${nextHandle}'`)).toBe(
			"1",
		);
		await page.reload({ waitUntil: "networkidle" });
		await expect(
			page.getByRole("group", { name: "Page editor toolbar" }),
		).toBeVisible();
	} finally {
		if (new URL(page.url()).pathname === `/${nextHandle}`) await change(handle);
	}
	expect(sql(`select count(*) from pages where handle='${handle}'`)).toBe("1");
});

test("editor-profile-and-handle: upload, crop, and remove a profile image", async ({
	page,
}) => {
	const originalKey = sql(
		`select coalesce(image_key, '') from pages where handle='${handle}'`,
	);
	test.skip(
		Boolean(originalKey),
		"The shared fixture already has a profile image, so this run must not replace user data.",
	);
	await openOwner(page);
	await page.getByRole("button", { name: "Change profile image" }).hover();
	const chooser = page.waitForEvent("filechooser");
	await page.getByRole("button", { name: "Change profile image" }).click();
	await (await chooser).setFiles("test-fixtures/feature-map-64.png");
	await expect
		.poll(() =>
			sql(`select coalesce(image_key, '') from pages where handle='${handle}'`),
		)
		.not.toBe("");
	await page.getByRole("button", { name: "Change profile image" }).hover();
	await page.getByRole("button", { name: "Crop profile image" }).click();
	const image = page.getByRole("dialog").locator("img").first();
	const box = await image.boundingBox();
	if (!box) throw new Error("profile image crop preview is missing");
	await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
	await page.mouse.down();
	await page.mouse.move(box.x + box.width / 2 + 12, box.y + box.height / 2 + 8);
	await page.mouse.up();
	await page.getByRole("button", { name: "Apply profile image crop" }).click();
	await waitForSave(page);
	expect(
		sql(
			`select coalesce(image_crop::text, '') from pages where handle='${handle}'`,
		),
	).not.toBe("");
	await page.getByRole("button", { name: "Change profile image" }).hover();
	await page.getByRole("button", { name: "Remove profile image" }).click();
	await waitForSave(page);
	await page.reload({ waitUntil: "networkidle" });
	expect(
		sql(
			`select coalesce(image_key, '') || '|' || coalesce(image_crop::text, '') from pages where handle='${handle}'`,
		),
	).toBe("|");
});

test("editor-text-formatting: text alignment and color controls save", async ({
	page,
}) => {
	const { toolbar, content } = await openOwner(page);
	await toolbar.getByRole("button", { name: "Add text" }).click();
	const text = content.getByRole("textbox", { name: "Text content" }).last();
	await text.fill("Playwright format check");
	const shell = text.locator("xpath=ancestor::*[@data-bento-item-id][1]");
	const itemId = await shell.getAttribute("data-bento-item-id");
	if (!itemId) throw new Error("text item has no id");
	await shell.hover();
	await shell.getByRole("button", { name: "Open text style options" }).click();
	await page.getByRole("button", { name: "Align text center" }).click();
	await expect(
		page.getByRole("button", { name: "Align text center" }),
	).toHaveAttribute("aria-pressed", "true");
	await page.getByRole("button", { name: "Align text to the bottom" }).click();
	await page
		.getByRole("button", { name: "Toggle text background color options" })
		.click();
	await page.getByRole("radio", { name: "Blue" }).click();
	const hex = page.getByRole("textbox", { name: "Text background hex color" });
	await hex.fill("#123abc");
	await hex.press("Enter");
	await waitForSave(page);
	await page.reload({ waitUntil: "networkidle" });
	const saved = page.locator(`[data-bento-item-id="${itemId}"]`);
	await expect(
		saved.getByRole("textbox", { name: "Text content" }),
	).toHaveValue("Playwright format check");
	expect(
		sql(
			`select (style->>'textAlign') || '|' || (style->>'verticalAlign') || '|' || (style->>'backgroundColor') from page_items where id='${itemId}'`,
		),
	).toBe("center|bottom|#123abc");
	await deleteItem(saved);
});

test("editor-map-editing: location search selects and saves a place", async ({
	page,
}) => {
	const { toolbar } = await openOwner(page);
	await toolbar.getByRole("button", { name: "Add map" }).click();
	const map = page.locator('[data-bento-item-type="map"]').last();
	const itemId = await map.getAttribute("data-bento-item-id");
	if (!itemId) throw new Error("new map item has no id");
	await map.hover();
	await map.getByRole("button", { name: "Search location" }).click();
	const search = page.getByRole("combobox", { name: "Search location" });
	await search.fill("Seoul");
	await expect(
		page.getByRole("listbox", { name: "Location results" }),
	).toBeVisible();
	await page.getByRole("option", { name: /Seoul/ }).click();
	await expect(map.getByRole("textbox", { name: "Media caption" })).toHaveValue(
		"Seoul",
	);
	await expect
		.poll(() =>
			sql(`select data->>'latitude' from page_items where id='${itemId}'`),
		)
		.toBe("37.5665");
	await page.reload({ waitUntil: "networkidle" });
	expect(
		sql(`select data->>'longitude' from page_items where id='${itemId}'`),
	).toBe("126.978");
	await deleteItem(page.locator(`[data-bento-item-id="${itemId}"]`));
});

test("editor-map-editing: caption and open-map link persist", async ({
	page,
}) => {
	const { toolbar, content } = await openOwner(page);
	await toolbar.getByRole("button", { name: "Add map" }).click();
	const map = content.locator('[data-bento-item-type="map"]').last();
	const itemId = await map.getAttribute("data-bento-item-id");
	if (!itemId) throw new Error("map item has no id");
	await map
		.getByRole("textbox", { name: "Media caption" })
		.fill("Playwright map caption");
	await map.hover();
	await waitForSave(page);
	await page.reload({ waitUntil: "networkidle" });
	expect(
		sql(`select data->>'caption' from page_items where id='${itemId}'`),
	).toBe("Playwright map caption");
	await expect(
		page
			.locator(`[data-bento-item-id="${itemId}"]`)
			.getByRole("link", { name: "Open location in Google Maps" }),
	).toHaveAttribute("href", /google\.com\/maps/);
	await deleteItem(page.locator(`[data-bento-item-id="${itemId}"]`));
});

test("editor-map-editing: current location updates and persists the map position", async ({
	page,
}) => {
	await page.context().grantPermissions(["geolocation"]);
	await page
		.context()
		.setGeolocation({ latitude: 37.5665, longitude: 126.978 });
	const { toolbar, content } = await openOwner(page);
	await toolbar.getByRole("button", { name: "Add map" }).click();
	const map = content.locator('[data-bento-item-type="map"]').last();
	const itemId = await map.getAttribute("data-bento-item-id");
	if (!itemId) throw new Error("new map item has no id");
	await map.hover();
	await map.getByRole("button", { name: "Open map controls" }).click();
	await map.getByRole("button", { name: "Use current location" }).click();
	await expect
		.poll(() =>
			sql(`select data->>'latitude' from page_items where id='${itemId}'`),
		)
		.toBe("37.5665");
	await page.reload({ waitUntil: "networkidle" });
	expect(
		sql(`select data->>'longitude' from page_items where id='${itemId}'`),
	).toBe("126.978");
	await deleteItem(page.locator(`[data-bento-item-id="${itemId}"]`));
});

test("editor-map-editing: zoom changes and persists", async ({ page }) => {
	const { toolbar, content } = await openOwner(page);
	await toolbar.getByRole("button", { name: "Add map" }).click();
	const map = content.locator('[data-bento-item-type="map"]').last();
	const itemId = await map.getAttribute("data-bento-item-id");
	if (!itemId) throw new Error("new map item has no id");
	await map.hover();
	await map.getByRole("button", { name: "Open map controls" }).click();
	const beforeZoom = sql(
		`select data->>'zoom' from page_items where id='${itemId}'`,
	);
	await map.getByRole("button", { name: "Zoom in" }).click();
	await expect
		.poll(() =>
			sql(`select data->>'zoom' from page_items where id='${itemId}'`),
		)
		.not.toBe(beforeZoom);
	await page.reload({ waitUntil: "networkidle" });
	expect(
		sql(`select data->>'zoom' from page_items where id='${itemId}'`),
	).not.toBe(beforeZoom);
	await deleteItem(page.locator(`[data-bento-item-id="${itemId}"]`));
});

test("editor-media-upload: local R2 upload completes and renders after reload", async ({
	page,
}) => {
	const { toolbar, content } = await openOwner(page);
	const file = "test-fixtures/feature-map-64.png";
	const externalR2: string[] = [];
	page.on("request", (request) => {
		if (new URL(request.url()).hostname.endsWith(".r2.cloudflarestorage.com")) {
			externalR2.push(request.url());
		}
	});
	const before = Number(
		sql(
			`select count(*) from page_items where page_id=(select id from pages where handle='${handle}') and type='media' and data ? 'objectKey'`,
		),
	);
	const chooser = page.waitForEvent("filechooser");
	await toolbar.getByRole("button", { name: "Add media" }).click();
	await (await chooser).setFiles(file);
	await expect(
		content.getByRole("textbox", { name: "Media caption" }).last(),
	).toBeVisible();
	await waitForSave(page);
	await page.reload({ waitUntil: "networkidle" });
	expect(
		Number(
			sql(
				`select count(*) from page_items where page_id=(select id from pages where handle='${handle}') and type='media' and data ? 'objectKey'`,
			),
		),
	).toBe(before + 1);
	const objectKey = sql(
		`select data->>'objectKey' from page_items where page_id=(select id from pages where handle='${handle}') and type='media' order by created_at desc limit 1`,
	);
	expect(
		(await page.request.get(`http://127.0.0.1:3001/media/${objectKey}`)).ok(),
	).toBe(true);
	expect(externalR2).toEqual([]);
	await deleteItem(
		content
			.locator("[data-bento-item-id]")
			.filter({
				has: page.getByRole("textbox", { name: "Media caption" }).last(),
			})
			.last(),
	);
});

test("editor-media-upload: deleting during a held upload cancels it without adding an item", async ({
	page,
}) => {
	const { toolbar, content } = await openOwner(page);
	const before = Number(
		sql(
			`select count(*) from page_items where page_id=(select id from pages where handle='${handle}')`,
		),
	);
	let heldKey = "";
	let signalHeld!: () => void;
	let releasePut!: () => void;
	const held = new Promise<void>((resolve) => {
		signalHeld = resolve;
	});
	await page.route("**/cdn-cgi/local/r2/s3/**", async (route) => {
		if (route.request().method() !== "PUT") return route.continue();
		heldKey = decodeURIComponent(
			new URL(route.request().url()).pathname
				.split("/cdn-cgi/local/r2/s3/")[1]
				?.split("/")
				.slice(1)
				.join("/") ?? "",
		);
		signalHeld();
		await new Promise<void>((resolve) => {
			releasePut = resolve;
		});
		return route.abort();
	});
	const chooser = page.waitForEvent("filechooser");
	await toolbar.getByRole("button", { name: "Add media" }).click();
	await (await chooser).setFiles("test-fixtures/feature-map-64.png");
	await held;
	const placeholder = content
		.getByRole("textbox", { name: "Media caption" })
		.last();
	const shell = placeholder.locator(
		"xpath=ancestor::*[@data-bento-item-id][1]",
	);
	const canceled = page.waitForResponse((response) =>
		response.url().includes(`/pages/${handle}/items/upload/cancel`),
	);
	await deleteItem(shell);
	releasePut();
	const response = await canceled;
	expect(response.status()).toBe(204);
	expect(
		Number(
			sql(
				`select count(*) from page_items where page_id=(select id from pages where handle='${handle}')`,
			),
		),
	).toBe(before);
	expect(
		sql(`select status from page_media_assets where object_key='${heldKey}'`),
	).toBe("pending_delete");
	expect(
		(await page.request.get(`http://127.0.0.1:3001/media/${heldKey}`)).status(),
	).toBe(404);
});

test("editor-tweet: advanced catalog includes the X post widget", async ({
	page,
}) => {
	const { toolbar } = await openOwner(page);
	await toolbar.getByRole("button", { name: "Advanced" }).click();
	const dialog = page.getByRole("dialog", { name: "Advanced widgets" });
	await expect(dialog.getByRole("button", { name: /Tweet/ })).toBeVisible();
});

test("editor-tweet: invalid and public post URLs show the right result", async ({
	page,
}) => {
	const { toolbar } = await openOwner(page);
	await toolbar.getByRole("button", { name: "Advanced" }).click();
	await page.getByRole("button", { name: "Tweet" }).click();
	const dialog = page.getByRole("dialog", { name: "Tweet" });
	const input = dialog.getByRole("textbox", { name: "Tweet ID or URL" });
	const before = sql(
		`select count(*) from page_items where page_id=(select id from pages where handle='${handle}') and type='tweet'`,
	);
	await input.fill("https://x.com/i/status/1");
	await dialog.getByRole("button", { name: "Add" }).click();
	await expect(dialog.getByRole("alert")).toHaveText(
		"Could not add this post. Check the URL or ID and try again.",
	);
	expect(
		sql(
			`select count(*) from page_items where page_id=(select id from pages where handle='${handle}') and type='tweet'`,
		),
	).toBe(before);
	await input.fill("https://x.com/jack/status/20");
	await dialog.getByRole("button", { name: "Add" }).click();
	await expect(dialog).toBeHidden();
	const itemId = sql(
		`select id from page_items where page_id=(select id from pages where handle='${handle}') and type='tweet' and data->>'url'='https://x.com/i/status/20' order by created_at desc limit 1`,
	);
	expect(itemId).not.toBe("");
	await page.reload({ waitUntil: "networkidle" });
	await expect(page.locator(`[data-bento-item-id="${itemId}"]`)).toBeVisible();
	await deleteItem(page.locator(`[data-bento-item-id="${itemId}"]`));
});

test("editor-media-editing: saved media caption remains after reload", async ({
	page,
}) => {
	const { toolbar, content } = await openOwner(page);
	const chooser = page.waitForEvent("filechooser");
	await toolbar.getByRole("button", { name: "Add media" }).click();
	await (await chooser).setFiles("test-fixtures/feature-map-64.png");
	const caption = content
		.getByRole("textbox", { name: "Media caption" })
		.last();
	await expect(caption).toBeVisible();
	const shell = caption.locator("xpath=ancestor::*[@data-bento-item-id][1]");
	const itemId = await shell.getAttribute("data-bento-item-id");
	if (!itemId) throw new Error("new media item has no id");
	const before = await caption.inputValue();
	await caption.fill("Feature map media caption");
	await waitForSave(page);
	await page.reload({ waitUntil: "networkidle" });
	const saved = page
		.locator(`[data-bento-item-id="${itemId}"]`)
		.getByRole("textbox", { name: "Media caption" });
	await expect(saved).toHaveValue("Feature map media caption");
	await saved.fill(before);
	await waitForSave(page);
	await deleteItem(page.locator(`[data-bento-item-id="${itemId}"]`));
});

test("editor-media-editing: media crop and destination save and can be cleared", async ({
	page,
}) => {
	const { toolbar, content } = await openOwner(page);
	const chooser = page.waitForEvent("filechooser");
	await toolbar.getByRole("button", { name: "Add media" }).click();
	await (await chooser).setFiles("test-fixtures/feature-map-64.png");
	const caption = content
		.getByRole("textbox", { name: "Media caption" })
		.last();
	const shell = caption.locator("xpath=ancestor::*[@data-bento-item-id][1]");
	const itemId = await shell.getAttribute("data-bento-item-id");
	if (!itemId) throw new Error("new media item has no id");
	await expect(shell.getByRole("button", { name: "Crop media" })).toBeVisible();
	await shell.getByRole("button", { name: "Crop media" }).click();
	const crop = shell.getByRole("button", { name: "Drag media to crop" });
	const box = await crop.boundingBox();
	if (!box) throw new Error("media crop handle is missing");
	await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
	await page.mouse.down();
	await page.mouse.move(
		box.x + box.width / 2 + 10,
		box.y + box.height / 2 + 10,
	);
	await page.mouse.up();
	await shell.getByRole("button", { name: "Apply media crop" }).click();
	await waitForSave(page);
	const savedCrop = sql(
		`select coalesce(data->'crop'->'wide', data->'crop'->'compact')::text from page_items where id='${itemId}'`,
	);
	expect(savedCrop).not.toBe("");
	await shell.hover();
	await shell.getByRole("button", { name: "Add media link" }).click();
	const destination = page.getByRole("textbox", { name: "Link URL" }).last();
	await destination.fill("https://example.com/featuremap-media");
	await destination.press("Enter");
	await waitForSave(page);
	await page.reload({ waitUntil: "networkidle" });
	const saved = page.locator(`[data-bento-item-id="${itemId}"]`);
	expect(
		sql(
			`select coalesce(data->'crop'->'wide', data->'crop'->'compact')::text from page_items where id='${itemId}'`,
		),
	).toBe(savedCrop);
	await expect(saved.getByRole("link", { name: "Open media" })).toHaveAttribute(
		"href",
		"https://example.com/featuremap-media",
	);
	expect(sql(`select data->>'url' from page_items where id='${itemId}'`)).toBe(
		"https://example.com/featuremap-media",
	);
	await saved.hover();
	await saved.getByRole("button", { name: "Edit media link" }).click();
	const destinationEdit = page
		.getByRole("textbox", { name: "Link URL" })
		.last();
	await destinationEdit.fill("");
	await destinationEdit.press("Enter");
	await waitForSave(page);
	await page.reload({ waitUntil: "networkidle" });
	expect(
		sql(
			`select coalesce(data->>'url', '') from page_items where id='${itemId}'`,
		),
	).toBe("");
	await deleteItem(page.locator(`[data-bento-item-id="${itemId}"]`));
});

test("editor-link-card-images: local R2 image picker is available", async ({
	page,
}) => {
	const { toolbar, content } = await openOwner(page);
	await toolbar.getByRole("button", { name: "Add link" }).click();
	const url = page.getByRole("textbox", { name: "Link URL" }).last();
	await url.fill("https://example.com/feature-map-image");
	await url.press("Enter");
	const card = content.locator('[data-bento-item-type="link"]').last();
	await expect(card).toBeVisible();
	const itemId = await card.getAttribute("data-bento-item-id");
	if (!itemId) throw new Error("new link card has no item id");
	await card.locator('[class~="group/link-image"]').hover();
	const firstPicker = page.waitForEvent("filechooser");
	await card.getByRole("button", { name: "Add link image" }).click();
	await (await firstPicker).setFiles("test-fixtures/feature-map-64.png");
	await expect
		.poll(() =>
			sql(`select data->>'imageKey' from page_items where id='${itemId}'`),
		)
		.not.toBe("");
	const firstKey = sql(
		`select data->>'imageKey' from page_items where id='${itemId}'`,
	);
	await card.locator('[class~="group/link-image"]').hover();
	const replacePicker = page.waitForEvent("filechooser");
	await card.getByRole("button", { name: "Replace link image" }).click();
	await (await replacePicker).setFiles("test-fixtures/feature-map-64.png");
	await expect
		.poll(() =>
			sql(`select data->>'imageKey' from page_items where id='${itemId}'`),
		)
		.not.toBe(firstKey);
	await card.locator('[class~="group/link-image"]').hover();
	await card.getByRole("button", { name: "Remove link image" }).click();
	await expect
		.poll(() =>
			sql(`select data->>'imageKey' from page_items where id='${itemId}'`),
		)
		.toBe("");
	await deleteItem(card);
});

test("editor-advanced-widgets: Spotify and RSS previews can be added and saved", async ({
	page,
}) => {
	const { toolbar } = await openOwner(page);
	await toolbar.getByRole("button", { name: "Advanced" }).click();
	await page.getByRole("button", { name: "Spotify" }).click();
	const spotifyDialog = page.getByRole("dialog", { name: "Spotify" });
	await spotifyDialog
		.getByRole("textbox", { name: "Spotify URL" })
		.fill("https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC");
	await expect(
		spotifyDialog.getByRole("button", { name: "Add" }),
	).toBeEnabled();
	await spotifyDialog.getByRole("button", { name: "Add" }).click();
	await expect(spotifyDialog).toBeHidden();
	const spotifyId = sql(
		`select id from page_items where page_id=(select id from pages where handle='${handle}') and type='spotify' and data->>'url'='https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC' order by created_at desc limit 1`,
	);
	expect(spotifyId).not.toBe("");
	await page.reload({ waitUntil: "networkidle" });
	await expect(
		page.locator(`[data-bento-item-id="${spotifyId}"]`),
	).toBeVisible();
	await deleteItem(page.locator(`[data-bento-item-id="${spotifyId}"]`));
	await toolbar.getByRole("button", { name: "Advanced" }).click();
	await page.getByRole("button", { name: "RSS Feed" }).click();
	const rssDialog = page.getByRole("dialog", { name: "RSS Feed" });
	await rssDialog
		.getByRole("textbox", { name: "RSS feed URL" })
		.fill("https://feeds.bbci.co.uk/news/world/rss.xml");
	await rssDialog.getByRole("button", { name: "Add" }).click();
	await expect(rssDialog).toBeHidden();
	const rssId = sql(
		`select id from page_items where page_id=(select id from pages where handle='${handle}') and type='rss' and data->>'url'='https://feeds.bbci.co.uk/news/world/rss.xml' order by created_at desc limit 1`,
	);
	expect(rssId).not.toBe("");
	await page.reload({ waitUntil: "networkidle" });
	await expect(page.locator(`[data-bento-item-id="${rssId}"]`)).toBeVisible();
	await deleteItem(page.locator(`[data-bento-item-id="${rssId}"]`));
});

test("editor-advanced-widgets: Calendly can add an event when a test connection exists", async ({
	page,
}) => {
	test.skip(
		!process.env.FEATURE_MAP_CALENDLY_TESTS,
		"Calendly requires a connected test account with an available event, as recorded in the feature map.",
	);
	const { toolbar } = await openOwner(page);
	await toolbar.getByRole("button", { name: "Advanced" }).click();
	await page.getByRole("button", { name: "Calendly" }).click();
	const dialog = page.getByRole("dialog", { name: "Calendly" });
	await expect(dialog.getByText("Select your event")).toBeVisible();
	const event = dialog.getByRole("list").getByRole("button").first();
	await expect(event).toBeVisible();
	const eventTitle = await event.innerText();
	await event.click();
	await dialog.getByRole("button", { name: "Add" }).click();
	await expect(dialog).toBeHidden();
	const itemId = sql(
		`select id from page_items where page_id=(select id from pages where handle='${handle}') and type='calendly' order by created_at desc limit 1`,
	);
	expect(itemId).not.toBe("");
	await page.reload({ waitUntil: "networkidle" });
	await expect(page.locator(`[data-bento-item-id="${itemId}"]`)).toBeVisible();
	expect(
		sql(`select data->>'eventTypeUri' from page_items where id='${itemId}'`),
	).not.toBe("");
	expect(eventTitle).not.toBe("");
	await deleteItem(page.locator(`[data-bento-item-id="${itemId}"]`));
});

test("editor-advanced-widgets: the Pro gate works with a separate Free account", async ({
	browser,
}) => {
	const storageState = process.env.FEATURE_MAP_FREE_STORAGE_STATE;
	const freeHandle = process.env.FEATURE_MAP_FREE_HANDLE;
	test.skip(
		!storageState || !freeHandle,
		"The feature map requires a separate Free account; configure its storage state and handle without changing the shared Pro fixture.",
	);
	if (!storageState || !freeHandle) return;
	const context = await browser.newContext({ storageState });
	try {
		const page = await context.newPage();
		await page.goto(`http://127.0.0.1:3000/${freeHandle}`, {
			waitUntil: "networkidle",
		});
		const before = sql(
			`select count(*) from page_items where page_id=(select id from pages where handle='${freeHandle}')`,
		);
		await page.getByRole("button", { name: "Advanced" }).click();
		await page.getByRole("button", { name: "Spotify" }).click();
		await expect(
			page.getByRole("dialog", { name: "Upgrade to Pro" }),
		).toBeVisible();
		expect(
			sql(
				`select count(*) from page_items where page_id=(select id from pages where handle='${freeHandle}')`,
			),
		).toBe(before);
	} finally {
		await context.close();
	}
});
