import { createAuth } from "@grabbin/auth";
import { createCreemClient } from "@grabbin/auth/creem-server";
import { createDb } from "@grabbin/db";
import { env } from "@grabbin/env/server";
import { consoleLoggingIntegration, sentry } from "@sentry/hono/cloudflare";
import { initLogger } from "evlog";
import { evlog } from "evlog/hono";
import { Hono } from "hono";
import { createFactory } from "hono/factory";
import { prettyJSON } from "hono/pretty-json";
import { timing } from "hono/timing";
import { trimTrailingSlash } from "hono/trailing-slash";
import { jsonApiError } from "./api-error";
import { createPageDomainsController } from "./controllers/page-domains.controller";
import { pageItemsController } from "./controllers/page-items.route";
import { pagesController } from "./controllers/pages.controller";
import { providerIconsController } from "./controllers/provider-icons.controller";
import { createApiCors } from "./middlewares/cors.middleware";
import { requiredSession } from "./middlewares/session.middleware";
import {
	createOrResumeProCheckout,
	scheduleProCancellation,
} from "./services/billing.service";
import { createBoundPageDomainService } from "./services/page-domain.service";
import { reconcileUserPageLifecycle } from "./services/page-lifecycle.service";
import { runScheduledJobs } from "./services/scheduled.service";
import type { AppEnv } from "./types";

function proProductIds(bindings: AppEnv["Bindings"]) {
	return [
		bindings.CREEM_PRO_MONTHLY_PRODUCT_ID,
		bindings.CREEM_PRO_YEARLY_PRODUCT_ID,
	].filter(Boolean);
}

function authWithBillingSync(
	db: Awaited<ReturnType<typeof createDb>>,
	bindings: AppEnv["Bindings"],
) {
	return createAuth(db, {
		onSubscriptionChange: (userId) =>
			reconcileUserPageLifecycle({
				db,
				userId,
				proProductIds: proProductIds(bindings),
			}),
	});
}

initLogger({ env: { service: "grabbin-server" }, pretty: true });

const createRoutes = new Hono<AppEnv>().get("/", (c) => {
	return c.json("OK", 200);
});

const app = createFactory<AppEnv>({
	initApp: (app) => {
		app.use(
			sentry(app, (runtimeEnv) => ({
				dsn: runtimeEnv.SENTRY_DSN,
				enableLogs: true,
				enableMetrics: true,
				tracesSampleRate: 0.1,
				sendDefaultPii: false,
				integrations: [
					consoleLoggingIntegration({
						levels: ["log", "info", "warn", "error"],
					}),
				],
			})),
		);
		app.use(evlog());
		app.use(prettyJSON());
		app.use(timing());
		app.use(trimTrailingSlash());
		app.use(
			"/*",
			createApiCors({
				origin: env.CORS_ORIGIN,
				resolveDomain: async (hostname, c) => {
					const db = await createDb();
					try {
						return await createBoundPageDomainService(db, c.env).resolve(
							hostname,
						);
					} finally {
						await db.$client.end();
					}
				},
			}),
		);
	},
})
	.createApp()
	.notFound((c) => jsonApiError(c, { status: 404 }))
	.onError((error, c) => {
		console.error(error);
		return jsonApiError(c, { status: 500 });
	})
	.on("POST", "/auth/creem/create-checkout", requiredSession, async (c) => {
		const session = c.var.session;
		if (!session) {
			return jsonApiError(c, {
				status: 401,
				detail: "Authentication required.",
			});
		}
		const body = await c.req.raw
			.clone()
			.json<{ productId?: unknown; successUrl?: unknown }>()
			.catch(() => null);
		const allowedProductIds = proProductIds(c.env);
		if (
			!body ||
			typeof body.productId !== "string" ||
			!allowedProductIds.includes(body.productId)
		) {
			return jsonApiError(c, {
				status: 422,
				code: "INVALID_PLAN",
				detail: "Choose an available Pro plan.",
			});
		}
		let successUrl: string;
		try {
			const defaultUrl = new URL(c.env.CREEM_SUCCESS_URL);
			const requestedUrl =
				typeof body.successUrl === "string"
					? new URL(body.successUrl, defaultUrl)
					: defaultUrl;
			if (requestedUrl.origin !== defaultUrl.origin) throw new Error();
			successUrl = requestedUrl.toString();
		} catch {
			return jsonApiError(c, {
				status: 422,
				code: "INVALID_SUCCESS_URL",
				detail: "Choose a valid return URL.",
			});
		}
		const creem = createCreemClient({
			apiKey: c.env.CREEM_API_KEY,
			testMode: c.env.CREEM_TEST_MODE === "true",
		});
		const checkoutResult = await createOrResumeProCheckout({
			db: c.var.db,
			creem,
			userId: session.user.id,
			email: session.user.email,
			productId: body.productId,
			successUrl,
		});
		if ("error" in checkoutResult) {
			return jsonApiError(c, {
				status: checkoutResult.error === "CHECKOUT_UNAVAILABLE" ? 503 : 409,
				code: checkoutResult.error,
				detail:
					checkoutResult.error === "SUBSCRIPTION_EXISTS"
						? "This account already has a subscription."
						: checkoutResult.error === "CHECKOUT_PROCESSING"
							? "Your payment is processing. Please try again shortly."
							: checkoutResult.error === "CHECKOUT_IN_PROGRESS"
								? "Finish or wait for your current checkout before choosing another plan."
								: "Checkout is temporarily unavailable. Please try again.",
			});
		}
		return c.json({ url: checkoutResult.url, redirect: false });
	})
	.on("POST", "/billing/cancel-subscription", requiredSession, async (c) => {
		const session = c.var.session;
		if (!session) {
			return jsonApiError(c, {
				status: 401,
				detail: "Authentication required.",
			});
		}
		try {
			const scheduled = await scheduleProCancellation({
				db: c.var.db,
				creem: createCreemClient({
					apiKey: c.env.CREEM_API_KEY,
					testMode: c.env.CREEM_TEST_MODE === "true",
				}),
				userId: session.user.id,
			});
			if (!scheduled) {
				return jsonApiError(c, {
					status: 409,
					code: "SUBSCRIPTION_NOT_ACTIVE",
					detail: "There is no active subscription to cancel.",
				});
			}
			await reconcileUserPageLifecycle({
				db: c.var.db,
				userId: session.user.id,
				proProductIds: proProductIds(c.env),
			});
			return c.json({ success: true });
		} catch {
			return jsonApiError(c, {
				status: 503,
				code: "SUBSCRIPTION_CANCELLATION_FAILED",
				detail:
					"Could not schedule subscription cancellation. Please try again.",
			});
		}
	})
	.on(["POST", "GET"], "/auth/*", async (c) =>
		(await authWithBillingSync(await createDb(), c.env)).handler(c.req.raw),
	)
	.route("/", createRoutes)
	.route("/pages", pagesController)
	.route("/pages", pageItemsController)
	.route("/provider-icons", providerIconsController)
	.route(
		"/pages",
		createPageDomainsController({
			databaseMiddleware: async (c, next) => {
				c.set("db", await createDb());
				await next();
			},
			sessionMiddleware: requiredSession,
			service: (c) => createBoundPageDomainService(c.var.db, c.env),
		}),
	);

export type AppType = typeof app;
export type { ApiError } from "@grabbin/api";

export async function scheduled(
	controller: ScheduledController,
	bindings: AppEnv["Bindings"],
) {
	const db = await createDb();
	try {
		await runScheduledJobs({
			db,
			bindings,
			date: new Date(controller.scheduledTime),
			cron: controller.cron,
		});
	} finally {
		await db.$client.end();
	}
}

export default app;
