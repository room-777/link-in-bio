import { createHmac, randomBytes } from "node:crypto";
import { appendFileSync, mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import {
	type Browser,
	type BrowserContextOptions,
	test as base,
	expect,
	type Page,
} from "@playwright/test";
import { addLink, addMedia, addText } from "./editor.ts";
import { gotoReady, prepareContext, track } from "./journey.ts";
import { JOURNEYS, type JourneyId } from "./journeys.ts";
import {
	ACCOUNT,
	db,
	HANDLE,
	LOGS_DIR,
	redacted,
	SCREENSHOTS_DIR,
	sql,
} from "./local.ts";
import { installLocalMocks } from "./mocks.ts";
import { control } from "./ui.ts";

export type Owner = {
	userId: string;
	email: string;
	handle: string;
	pageId: string;
	storageState: NonNullable<
		Exclude<BrowserContextOptions["storageState"], string>
	>;
};

type WorkerFixtures = {
	journeyId: JourneyId;
	owner: Owner;
	ownerPage: Page;
	signedOutPage: Page;
	textItem: string;
	linkItem: string;
	mediaItem: string;
};
type TestFixtures = {
	openOwnerPage: () => Promise<Page>;
	failureProof: undefined;
};

export const SEED_TEXT = "Feature map seeded text";
export const SEED_LINK = "https://example.com/featuremap-metadata";
const VIEWPORT = { width: 1365, height: 900 };
// Pages opened in this worker, newest last, for the failure screenshot.
const openPages: Page[] = [];

function authSecret() {
	const stack = process.env.FEATUREMAP_STACK_DIR ?? LOGS_DIR;
	return JSON.parse(
		readFileSync(path.join(stack, "server.wrangler.jsonc"), "utf8"),
	).vars.BETTER_AUTH_SECRET as string;
}

/**
 * Copies the base owner (user, page, local Pro subscription) into a journey's
 * own account and signs a session cookie the way better-auth does
 * (`${token}.${base64 HMAC-SHA256}`), so journeys share no page, items,
 * profile, handle or session. Deleting the user first makes reseeding
 * idempotent: its page, items and session cascade.
 */
export async function seedOwner(n: number): Promise<Owner> {
	const userId = `featuremap-j${n}`;
	const email = ACCOUNT.replace("@", `+j${n}@`);
	const handle = `${HANDLE}-j${n}`;
	const baseUser = await db(
		`select id from "user" where email=${sql(ACCOUNT)}`,
	);
	if (!baseUser)
		throw new Error(
			`Base account ${ACCOUNT} is missing; run the setup project.`,
		);
	const token = randomBytes(24).toString("base64url");
	await db(`begin;
		delete from "user" where id=${sql(userId)};
		insert into "user" (id, name, email, email_verified, image, creem_customer_id, had_trial, created_at, updated_at, role)
			select ${sql(userId)}, name, ${sql(email)}, email_verified, image, null, had_trial, now(), now(), role from "user" where id=${sql(baseUser)};
		insert into pages (id, user_id, handle, name, bio, image_key, image_source, image_crop, role, created_at, updated_at)
			select gen_random_uuid()::text, ${sql(userId)}, ${sql(handle)}, name, bio, null, null, null, role, now(), now()
			from pages where user_id=${sql(baseUser)} and handle=${sql(HANDLE)};
		insert into creem_subscription (id, product_id, reference_id, creem_customer_id, creem_subscription_id, status, period_start, period_end, cancel_at_period_end)
			select ${sql(`${userId}-sub`)}, product_id, ${sql(userId)}, ${sql(`${userId}-customer`)}, ${sql(`${userId}-subscription`)}, status, period_start, period_end, cancel_at_period_end
			from creem_subscription where reference_id=${sql(baseUser)};
		insert into session (id, expires_at, token, created_at, updated_at, user_id)
			values (${sql(`${userId}-session`)}, now() + interval '1 day', ${sql(token)}, now(), now(), ${sql(userId)});
		commit;`);
	const pageId = await db(
		`select id from pages where user_id=${sql(userId)} and handle=${sql(handle)}`,
	);
	const plan = await db(
		`select product_id || ':' || status from creem_subscription where reference_id=${sql(userId)}`,
	);
	if (!pageId || plan !== "local-pro:active")
		throw new Error(
			`Seeded owner ${handle} has page=${pageId || "missing"} plan=${plan || "missing"}; the base account needs its page and local Pro grant.`,
		);
	const signature = createHmac("sha256", authSecret())
		.update(token)
		.digest("base64");
	return {
		userId,
		email,
		handle,
		pageId,
		storageState: {
			cookies: [
				{
					name: "better-auth.session_token",
					value: encodeURIComponent(`${token}.${signature}`),
					domain: "127.0.0.1",
					path: "/",
					expires: Math.floor(Date.now() / 1000) + 86_400,
					httpOnly: true,
					secure: false,
					sameSite: "Lax",
				},
			],
			origins: [],
		},
	};
}

function recordBrowserErrors(page: Page, journeyId: string) {
	const write = (text: string) => {
		mkdirSync(LOGS_DIR, { recursive: true });
		appendFileSync(
			path.join(LOGS_DIR, "browser-errors.txt"),
			`[${journeyId}] ${redacted(text)}\n`,
		);
	};
	page.on("pageerror", (error) => write(error.message));
	page.on("console", (message) => {
		if (message.type() === "error") write(message.text());
	});
}

async function openPage(
	browser: Browser,
	journeyId: string,
	options: BrowserContextOptions,
) {
	const context = await browser.newContext({ viewport: VIEWPORT, ...options });
	await prepareContext(context);
	await installLocalMocks(context);
	const page = await context.newPage();
	track(page);
	recordBrowserErrors(page, journeyId);
	openPages.push(page);
	return page;
}

export async function openEditor(
	browser: Browser,
	journeyId: string,
	owner: Owner,
	timeout = 25_000,
) {
	const page = await openPage(browser, journeyId, {
		storageState: owner.storageState,
		permissions: ["clipboard-read", "clipboard-write"],
	});
	await gotoReady(page, `/${owner.handle}`, timeout);
	await expect(control(page, "group", "Page editor toolbar")).toBeVisible({
		timeout,
	});
	return page;
}

export const test = base.extend<TestFixtures, WorkerFixtures>({
	journeyId: [JOURNEYS[0], { scope: "worker", option: true }],
	owner: [
		async ({ journeyId }, use) =>
			use(await seedOwner(JOURNEYS.indexOf(journeyId) + 1)),
		{ scope: "worker" },
	],
	ownerPage: [
		async ({ browser, journeyId, owner }, use) => {
			const page = await openEditor(browser, journeyId, owner);
			await use(page);
			await page.context().close();
		},
		{ scope: "worker", timeout: 60_000 },
	],
	signedOutPage: [
		async ({ browser, journeyId }, use) => {
			const page = await openPage(browser, journeyId, {});
			await use(page);
			await page.context().close();
		},
		{ scope: "worker" },
	],
	textItem: [
		async ({ ownerPage, owner }, use) =>
			use(await addText(ownerPage, owner.pageId, SEED_TEXT)),
		{ scope: "worker", timeout: 45_000 },
	],
	linkItem: [
		async ({ ownerPage, owner }, use) =>
			use(await addLink(ownerPage, owner.pageId, SEED_LINK)),
		{ scope: "worker", timeout: 45_000 },
	],
	mediaItem: [
		async ({ ownerPage, owner }, use) =>
			use(await addMedia(ownerPage, owner.pageId)),
		{ scope: "worker", timeout: 45_000 },
	],
	openOwnerPage: async ({ browser, journeyId, owner }, use) => {
		const opened: Page[] = [];
		await use(async () => {
			const page = await openEditor(browser, journeyId, owner);
			opened.push(page);
			return page;
		});
		for (const page of opened) await page.context().close();
	},
	failureProof: [
		async ({ journeyId }, use, testInfo) => {
			await use(undefined);
			const page = openPages.findLast((candidate) => !candidate.isClosed());
			if (testInfo.status === testInfo.expectedStatus || !page) return;
			const file = path.join(
				SCREENSHOTS_DIR,
				journeyId,
				`FAILED-${testInfo.title.replaceAll(/[^\w-]+/g, "-")}.png`,
			);
			await page
				.screenshot({ path: file, fullPage: true })
				.then(() =>
					testInfo.attachments.push({
						name: "failure",
						contentType: "image/png",
						path: file,
					}),
				)
				.catch(() => {});
		},
		{ auto: true },
	],
});

export { expect };

/**
 * Declares the calling file as one mapped journey: its tests are the
 * journey's sub-features, run in order on one owner page, and the journey's
 * fixtures seed an owner nobody else uses.
 */
export function journey(id: JourneyId) {
	test.use({ journeyId: id });
	test.describe.configure({ mode: "serial" });
	return test;
}
