import { env } from "@grabbin/env/web";
import * as Sentry from "@sentry/react";

const hostname = window.location.hostname;
if (
	!(
		["localhost", "127.0.0.1", "[::1]", "::1"].includes(hostname) ||
		hostname.endsWith(".localhost")
	)
) {
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
}
