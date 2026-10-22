import { expect, openEditor, seedOwner, test } from "../harness/fixtures.ts";
import { gotoReady, settled } from "../harness/journey.ts";
import { ACCOUNT, db, HANDLE, sql } from "../harness/local.ts";
import { control, labelled, otpInput } from "../harness/ui.ts";

const accountRows = () =>
	db(
		`select count(*) from pages p join "user" u on u.id=p.user_id where u.email=${sql(ACCOUNT)} and p.handle=${sql(HANDLE)}`,
	);

// The editor warm-up opens a copy of the base account, so it runs after it.
test.describe.configure({ mode: "serial" });

// Every journey copies this base account, so it is made once through the
// product UI (sign-in, then /create) and kept in the stack's database.
test("base account and page", async ({ signedOutPage: page }) => {
	if ((await accountRows()) !== "1") {
		await gotoReady(page, "/sign-in");
		await control(page, "textbox", "Email").fill(ACCOUNT);
		await control(page, "button", "Send OTP").click();
		await expect(otpInput(page)).toBeVisible({ timeout: 15_000 });
		const code = await db(
			`select split_part(value, ':', 1) from verification where identifier=${sql(`sign-in-otp-${ACCOUNT}`)} and expires_at > now() order by created_at desc limit 1`,
		);
		expect(code).toMatch(/^\d{6}$/);
		await otpInput(page).fill(code);
		await control(page, "button", "Verify code").click();
		await settled(page);
		await gotoReady(page, "/create");
		const handle = control(page, "textbox", "Handle");
		await handle.fill(HANDLE);
		await expect(labelled(page, "Handle available")).toBeVisible();
		await control(page, "button", "Grab it").click();
		await expect(control(page, "heading", "Looking good!")).toBeVisible({
			timeout: 20_000,
		});
		expect(await accountRows()).toBe("1");
	}
	const userId = await db(`select id from "user" where email=${sql(ACCOUNT)}`);
	await db(
		`insert into creem_subscription (id, product_id, reference_id, creem_subscription_id, status, period_start, period_end, cancel_at_period_end) values ('feature-map-local-pro', 'local-pro', ${sql(userId)}, 'feature-map-local-pro', 'active', now(), now() + interval '1 year', false) on conflict (id) do update set product_id='local-pro', reference_id=${sql(userId)}, status='active', period_start=now(), period_end=now()+interval '1 year', cancel_at_period_end=false`,
	);
});

// The first editor render compiles the editor route and its client chunks.
// Doing it once here keeps parallel journeys from all waiting on that compile.
test("editor route compiled", async ({ browser }) => {
	test.setTimeout(90_000);
	const page = await openEditor(browser, "setup", await seedOwner(0), 80_000);
	await page.context().close();
});
