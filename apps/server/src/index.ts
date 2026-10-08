import { createBoundPageDomainService } from "@grabbin/application/page-domain";
import { reconcileUserPageLifecycle } from "@grabbin/application/page-lifecycle";
import { createAuth } from "@grabbin/auth";
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
import { billingController } from "./controllers/billing.controller";
import { calendlyController } from "./controllers/calendly.controller";
import { localMediaController } from "./controllers/local-media.controller";
import { createPageDomainsController } from "./controllers/page-domains.controller";
import { pageItemsController } from "./controllers/page-items.route";
import { pagesController } from "./controllers/pages.controller";
import { providerIconsController } from "./controllers/provider-icons.controller";
import { createApiCors } from "./middlewares/cors.middleware";
import { requiredSession } from "./middlewares/session.middleware";
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
	.route("/", billingController)
	.route("/", calendlyController)
	.on(["POST", "GET"], "/auth/*", async (c) =>
		(await authWithBillingSync(await createDb(), c.env)).handler(c.req.raw),
	)
	.route("/", createRoutes)
	.route("/pages", pagesController)
	.route("/pages", pageItemsController)
	.route("/media", localMediaController)
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

export default app;
