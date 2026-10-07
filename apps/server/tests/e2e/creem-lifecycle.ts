import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";
import { reconcileExpiredSubscriptions } from "@grabbin/application/billing-reconciliation";
import { deleteExpiredPages } from "@grabbin/application/page-lifecycle";
import { drizzle, eq, inArray } from "@grabbin/db/drizzle";
import * as schema from "@grabbin/db/schema/index";
import {
	creemSubscription,
	pageMediaAssets,
	pages,
} from "@grabbin/db/schema/index";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { testUtils } from "better-auth/plugins";
import dotenv from "dotenv";
import { Client } from "pg";

dotenv.config({ path: ".env" });

const serverUrl = process.env.BETTER_AUTH_URL ?? "http://localhost:3001";
const databaseUrl = process.env.DATABASE_URL_LOCAL ?? process.env.DATABASE_URL;
const monthlyProductId =
	process.env.CREEM_PRO_MONTHLY_PRODUCT_ID ?? "prod_1M7K6uOQxjMu006ypD04R";
const yearlyProductId =
	process.env.CREEM_PRO_YEARLY_PRODUCT_ID ?? "prod_6oaKuPlsztLLAQt3Y5BlqD";
const appOrigin = new URL(serverUrl).origin;
const testOrigin = process.env.CREEM_TEST_ORIGIN ?? "http://localhost:3000";

function pass(id: string, evidence: Record<string, unknown>) {
	console.log(`${id} Pass ${JSON.stringify(evidence)}`);
}

async function expectStatus(
	response: Response,
	status: number,
	caseId: string,
) {
	const body = await response
		.clone()
		.json()
		.catch(() => null);
	assert.equal(response.status, status, `${caseId}: ${JSON.stringify(body)}`);
	return body;
}

async function waitFor<T>(
	read: () => Promise<T | null | undefined | false>,
	label: string,
): Promise<T> {
	const deadline = Date.now() + 5 * 60_000;
	while (Date.now() < deadline) {
		const result = await read();
		if (result) return result as T;
		await sleep(2_000);
	}
	throw new Error(
		`Timed out waiting for ${label}. Check the ngrok webhook delivery.`,
	);
}

function memoryBucket() {
	const keys = new Set<string>();
	return keys;
}

async function main() {
	assert.equal(
		process.env.CREEM_TEST_MODE,
		"true",
		"CREEM_TEST_MODE must be true.",
	);
	assert.ok(databaseUrl, "DATABASE_URL_LOCAL is required.");
	assert.ok(process.env.CREEM_API_KEY, "CREEM_API_KEY is required.");
	assert.ok(
		process.env.CREEM_WEBHOOK_SECRET,
		"CREEM_WEBHOOK_SECRET is required.",
	);
	const databaseHost = new URL(databaseUrl).hostname;
	assert.ok(
		["localhost", "127.0.0.1", "::1"].includes(databaseHost),
		"Refusing to use a non-local database.",
	);
	const server = new URL(serverUrl);
	assert.ok(
		["localhost", "127.0.0.1", "::1"].includes(server.hostname),
		"Refusing to use a non-local API server.",
	);
	process.env.CREEM_PRO_MONTHLY_PRODUCT_ID = monthlyProductId;
	process.env.CREEM_PRO_YEARLY_PRODUCT_ID = yearlyProductId;
	const serverResponse = await fetch(appOrigin).catch(() => null);
	assert.ok(
		serverResponse?.ok,
		`Start the existing local API server at ${appOrigin} before running this test.`,
	);

	const tunnelResponse = await fetch("http://127.0.0.1:4040/api/tunnels").catch(
		() => null,
	);
	assert.equal(
		tunnelResponse?.status,
		200,
		`Start ngrok http ${server.port || 80} first.`,
	);
	const tunnelData = (await tunnelResponse.json()) as {
		tunnels?: Array<{ public_url: string; config?: { addr?: string } }>;
	};
	const tunnel = tunnelData.tunnels?.find((item) => {
		if (!item.public_url.startsWith("https://") || !item.config?.addr) {
			return false;
		}
		try {
			const target = new URL(
				item.config.addr.includes("://")
					? item.config.addr
					: `http://${item.config.addr}`,
			);
			return (
				["localhost", "127.0.0.1", "::1"].includes(target.hostname) &&
				target.port ===
					(server.port || (server.protocol === "https:" ? "443" : "80"))
			);
		} catch {
			return false;
		}
	});
	assert.ok(
		tunnel,
		`An HTTPS ngrok tunnel forwarding to ${appOrigin} is required.`,
	);
	const tunnelUrl = tunnel.public_url;
	const webhookUrl = `${tunnelUrl}/auth/creem/webhook`;

	const creemBase = "https://test-api.creem.io/v1";
	const creemHeaders = { "x-api-key": process.env.CREEM_API_KEY };
	for (const [id, billingPeriod] of [
		[monthlyProductId, "every-month"],
		[yearlyProductId, "every-year"],
	] as const) {
		const response = await fetch(
			`${creemBase}/products?product_id=${encodeURIComponent(id)}`,
			{ headers: creemHeaders },
		);
		assert.equal(response.status, 200, `Test product ${id} is unavailable.`);
		const product = (await response.json()) as {
			id: string;
			mode: string;
			billing_period: string;
		};
		assert.equal(product.mode, "test");
		assert.equal(product.billing_period, billingPeriod);
	}
	pass("CREEM-E2E-001", { mode: "test", monthlyProductId, yearlyProductId });

	const webhookResponse = await fetch(`${creemBase}/webhooks`, {
		headers: creemHeaders,
	});
	assert.equal(
		webhookResponse.status,
		200,
		"Could not inspect Creem test webhooks.",
	);
	const webhookList = (await webhookResponse.json()) as {
		items?: Array<{ id: string; url: string; mode: string }>;
	};
	const webhook = webhookList.items?.find((item) => item.url === webhookUrl);
	assert.ok(webhook, `Creem test webhook must point to ${webhookUrl}.`);
	const secretResponse = await fetch(
		`${creemBase}/webhooks/${webhook.id}/secret`,
		{
			headers: creemHeaders,
		},
	);
	assert.equal(secretResponse.status, 200);
	const { secret } = (await secretResponse.json()) as { secret: string };
	assert.equal(
		secret,
		process.env.CREEM_WEBHOOK_SECRET,
		"Local webhook secret does not match Creem.",
	);
	pass("CREEM-E2E-002", { webhook: webhook.id, endpoint: webhookUrl });

	const databaseClient = new Client({ connectionString: databaseUrl });
	await databaseClient.connect();
	const db = drizzle({ client: databaseClient, schema });
	const testAuth = betterAuth({
		baseURL: serverUrl,
		basePath: "/auth",
		secret: process.env.BETTER_AUTH_SECRET,
		trustedOrigins: [testOrigin],
		plugins: [testUtils()],
		database: drizzleAdapter(db, {
			provider: "pg",
			schema: { ...schema, creem_subscription: schema.creemSubscription },
		}),
	});
	const test = (await testAuth.$context).test;
	const before = await databaseClient.query<{ users: number; pages: number }>(
		`select (select count(*)::int from "user") users, (select count(*)::int from pages) pages`,
	);
	const baseline = before.rows[0];
	assert.ok(baseline);
	const user = await test.saveUser(
		test.createUser({
			name: "Creem Lifecycle Test",
			email: `creem-e2e-${crypto.randomUUID()}@example.com`,
		}),
	);
	const authHeaders = await test.getAuthHeaders({ userId: user.id });
	assert.ok(
		authHeaders.has("cookie"),
		"Better Auth test session has no cookie.",
	);
	authHeaders.set("origin", testOrigin);
	let subscriptionId: string | undefined;
	let testDeleted = false;
	const handle = `creem-e2e-${crypto.randomUUID().slice(0, 8)}`;
	const api = async (path: string, init?: RequestInit) =>
		fetch(`${appOrigin}${path}`, {
			...init,
			headers: {
				...Object.fromEntries(authHeaders),
				...(init?.body ? { "content-type": "application/json" } : {}),
				...Object.fromEntries(new Headers(init?.headers)),
			},
		});

	try {
		const workerSessionResponse = await api("/auth/get-session");
		const workerSession = (await expectStatus(
			workerSessionResponse,
			200,
			"CREEM-E2E-003",
		)) as { user?: { id?: string } };
		assert.equal(workerSession.user?.id, user.id);
		pass("CREEM-E2E-003", {
			betterAuthTestUser: user.id,
			workerSession: "verified",
		});
		const firstPage = await api("/pages", {
			method: "POST",
			body: JSON.stringify({ handle }),
		});
		await expectStatus(firstPage, 201, "CREEM-E2E-003");
		const freeExtraPage = await api("/pages", {
			method: "POST",
			body: JSON.stringify({ handle: `${handle}-free` }),
		});
		const freeError = (await expectStatus(
			freeExtraPage,
			409,
			"CREEM-E2E-003",
		)) as { code?: string };
		assert.equal(freeError.code, "PAGE_LIMIT_REACHED");
		pass("CREEM-E2E-003", {
			freePageCount: 1,
			extraPageStatus: freeExtraPage.status,
		});

		const checkoutResponse = await api("/auth/creem/create-checkout", {
			method: "POST",
			body: JSON.stringify({
				productId: monthlyProductId,
				successUrl: `${testOrigin}/billing?checkout=success`,
			}),
		});
		const checkout = (await expectStatus(
			checkoutResponse,
			200,
			"CREEM-E2E-004",
		)) as {
			url: string;
		};
		assert.ok(checkout.url.startsWith("https://"));
		console.log(
			`Complete Creem sandbox checkout in the opened browser: ${checkout.url}`,
		);
		const browser = spawn("open", [checkout.url], {
			stdio: "ignore",
			detached: true,
		});
		browser.unref();
		const activeSubscription = await waitFor(async () => {
			const row = await db.query.creemSubscription.findFirst({
				where: eq(creemSubscription.referenceId, user.id),
			});
			return row?.status === "active" || row?.status === "paid" ? row : null;
		}, "the paid subscription webhook");
		subscriptionId = activeSubscription.creemSubscriptionId ?? undefined;
		assert.ok(subscriptionId);
		assert.equal(activeSubscription.productId, monthlyProductId);
		const sessionResponse = await api("/auth/get-session");
		const sessionBody = (await expectStatus(
			sessionResponse,
			200,
			"CREEM-E2E-004",
		)) as {
			user?: { plan?: { tier?: string } };
			plan?: { tier?: string };
		};
		assert.equal(sessionBody.user?.plan?.tier ?? sessionBody.plan?.tier, "pro");
		pass("CREEM-E2E-004", {
			productId: activeSubscription.productId,
			subscriptionId,
		});

		const addedPages = await Promise.all(
			["two", "three"].map((suffix) =>
				api("/pages", {
					method: "POST",
					body: JSON.stringify({ handle: `${handle}-${suffix}` }),
				}),
			),
		);
		for (const response of addedPages)
			await expectStatus(response, 201, "CREEM-E2E-005");
		const overLimit = await api("/pages", {
			method: "POST",
			body: JSON.stringify({ handle: `${handle}-four` }),
		});
		const proError = (await expectStatus(overLimit, 409, "CREEM-E2E-005")) as {
			code?: string;
		};
		assert.equal(proError.code, "PAGE_LIMIT_REACHED");
		pass("CREEM-E2E-005", {
			proPageCount: 3,
			fourthPageStatus: overLimit.status,
		});

		const cancelResponse = await api("/auth/creem/cancel-subscription", {
			method: "POST",
			body: JSON.stringify({ id: subscriptionId }),
		});
		await expectStatus(cancelResponse, 200, "CREEM-E2E-006");
		const canceledAtPeriodEnd = await waitFor(async () => {
			const row = await db.query.creemSubscription.findFirst({
				where: eq(creemSubscription.referenceId, user.id),
			});
			return row?.cancelAtPeriodEnd ? row : null;
		}, "the scheduled cancellation webhook");
		assert.ok(canceledAtPeriodEnd.periodEnd);
		const pageRows = await db.query.pages.findMany({
			where: eq(pages.userId, user.id),
		});
		const scheduledExtras = pageRows.filter((page) => page.handle !== handle);
		assert.equal(scheduledExtras.length, 2);
		for (const page of scheduledExtras) {
			assert.equal(
				page.deletionScheduledAt?.toISOString(),
				new Date(
					canceledAtPeriodEnd.periodEnd.getTime() + 7 * 24 * 60 * 60 * 1000,
				).toISOString(),
			);
		}
		pass("CREEM-E2E-006", {
			status: canceledAtPeriodEnd.status,
			periodEnd: canceledAtPeriodEnd.periodEnd.toISOString(),
			deleteAt: scheduledExtras[0]?.deletionScheduledAt?.toISOString(),
		});

		const mediaKeys = scheduledExtras.map(
			(page) => `users/${user.id}/pages/${page.id}/test-image.png`,
		);
		const media = memoryBucket();
		for (const key of mediaKeys) media.add(key);
		const cleanupTime = new Date(
			canceledAtPeriodEnd.periodEnd.getTime() + 8 * 24 * 60 * 60 * 1000,
		);
		await db.insert(pageMediaAssets).values(
			scheduledExtras.map((page, index) => ({
				objectKey: mediaKeys[index] as string,
				userId: user.id,
				pageId: page.id,
				status: "attached" as const,
				deleteAfter: null,
				uploadExpiresAt: cleanupTime,
			})),
		);
		const skippedUsers = await reconcileExpiredSubscriptions({
			db,
			now: cleanupTime,
			env: {
				CREEM_API_KEY: process.env.CREEM_API_KEY,
				CREEM_TEST_MODE: "true",
				CREEM_PRO_MONTHLY_PRODUCT_ID: monthlyProductId,
				CREEM_PRO_YEARLY_PRODUCT_ID: yearlyProductId,
			},
		});
		await deleteExpiredPages({
			db,
			now: cleanupTime,
			proProductIds: [monthlyProductId, yearlyProductId],
			skipUserIds: skippedUsers,
		});
		const remainingPages = await db.query.pages.findMany({
			where: eq(pages.userId, user.id),
		});
		assert.deepEqual(
			remainingPages.map((page) => page.handle),
			[handle],
		);
		assert.equal(media.size, 2);
		const queuedMedia = await db
			.select({ status: pageMediaAssets.status })
			.from(pageMediaAssets)
			.where(inArray(pageMediaAssets.objectKey, mediaKeys));
		assert.deepEqual(
			queuedMedia.map(({ status }) => status),
			["pending_delete", "pending_delete"],
		);
		pass("CREEM-E2E-007", {
			remainingPages: remainingPages.length,
			queuedMediaKeys: queuedMedia.length,
		});

		console.log(
			"CREEM lifecycle e2e passed. Cleaning up the sandbox user and subscription.",
		);
	} finally {
		if (subscriptionId) {
			const subscriptionIdToCancel = subscriptionId;
			await fetch(
				`${creemBase}/subscriptions/${subscriptionIdToCancel}/cancel`,
				{
					method: "POST",
					headers: { ...creemHeaders, "content-type": "application/json" },
					body: JSON.stringify({ mode: "immediate" }),
				},
			).catch(() => undefined);
			await waitFor(async () => {
				const response = await fetch(
					`${creemBase}/subscriptions?subscription_id=${encodeURIComponent(subscriptionIdToCancel)}`,
					{ headers: creemHeaders },
				);
				if (!response.ok) return null;
				const current = (await response.json()) as { status?: string };
				return ["canceled", "expired"].includes(current.status ?? "")
					? current
					: null;
			}, "sandbox subscription cancellation").catch(() => undefined);
			await waitFor(async () => {
				const row = await db.query.creemSubscription.findFirst({
					where: eq(creemSubscription.referenceId, user.id),
				});
				return row?.status === "canceled" || row?.status === "expired"
					? row
					: null;
			}, "the final cancellation webhook").catch(() => undefined);
		}
		await test.deleteUser(user.id).then(() => (testDeleted = true));
		const after = await databaseClient.query<{ users: number; pages: number }>(
			`select (select count(*)::int from "user") users, (select count(*)::int from pages) pages`,
		);
		assert.deepEqual(
			after.rows[0],
			baseline,
			"Test cleanup must restore local row counts.",
		);
		assert.ok(testDeleted, "Test user cleanup failed.");
		pass("CREEM-E2E-008", { testAccountRemoved: true, baselineRestored: true });
		await databaseClient.end();
	}
}

main().catch((error) => {
	console.error("CREEM lifecycle e2e failed", error);
	process.exitCode = 1;
});
