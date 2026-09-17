import { env } from "@my-better-t-app/env/web";
import * as Sentry from "@sentry/react";

Sentry.init({
	dsn: env.NEXT_PUBLIC_SENTRY_DSN,
	enableLogs: true,
	enableMetrics: true,
	tracesSampleRate: 0.1,
	sendDefaultPii: false,
	integrations: [
		Sentry.browserTracingIntegration(),
		Sentry.consoleLoggingIntegration({
			levels: ["log", "info", "warn", "error"],
		}),
	],
	tracePropagationTargets: [env.NEXT_PUBLIC_SERVER_URL],
});
