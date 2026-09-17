import { createAuth } from "@grabbin/auth";
import { env } from "@grabbin/env/server";
import { consoleLoggingIntegration, sentry } from "@sentry/hono/cloudflare";
import { initLogger } from "evlog";
import { type EvlogVariables, evlog } from "evlog/hono";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { createFactory } from "hono/factory";
import { prettyJSON } from "hono/pretty-json";
import { timing } from "hono/timing";
import { trimTrailingSlash } from "hono/trailing-slash";

import { jsonApiError } from "./api-error";

initLogger({ env: { service: "grabbin-server" }, pretty: true });

type AppEnv = EvlogVariables & {
	Bindings: {
		SENTRY_DSN: string;
	};
};

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
		app.use(prettyJSON()); // With options: prettyJSON({ space: 4 })
		app.use(timing());
		app.use(trimTrailingSlash());
		app.use(
			"/*",
			cors({
				origin: env.CORS_ORIGIN,
				allowMethods: ["GET", "POST", "OPTIONS"],
				allowHeaders: [
					"Content-Type",
					"Authorization",
					"baggage",
					"sentry-trace",
				],
				credentials: true,
			}),
		);
	},
})
	.createApp()
	.notFound((c) =>
		jsonApiError(c, {
			status: 404,
		}),
	)
	.onError((error, c) => {
		console.error(error);

		return jsonApiError(c, {
			status: 500,
		});
	})
	.on(["POST", "GET"], "/auth/*", async (c) =>
		(await createAuth()).handler(c.req.raw),
	)
	.route("/", createRoutes);

export type AppType = typeof app;
export type { ApiError } from "./api-error";

export default app;
