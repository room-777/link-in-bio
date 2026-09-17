import * as Sentry from "@sentry/cloudflare";
import handler from "vinext/server/fetch-handler";

export default Sentry.withSentry(
	(env) => ({
		dsn: env.SENTRY_DSN,
		enableLogs: true,
		enableMetrics: true,
		tracesSampleRate: 0.1,
		sendDefaultPii: false,
		integrations: [
			Sentry.consoleLoggingIntegration({
				levels: ["log", "info", "warn", "error"],
			}),
		],
	}),
	handler,
);
