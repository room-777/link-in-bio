import * as Sentry from "@sentry/browser";

function initializeSentry(dsn: unknown) {
  if (typeof dsn !== "string" || !dsn.trim()) return;

  Sentry.init({
    dsn,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.consoleLoggingIntegration({
        levels: ["log", "warn", "error"],
      }),
    ],
    tracesSampleRate: 1.0,
    enableLogs: true,
    enableMetrics: true,
    tracePropagationTargets: ["localhost", /^https:\/\/(api\.)?grabbin\.me/],
  });
}

void fetch("/api/sentry-dsn")
  .then((response) => (response.ok ? response.text() : ""))
  .then(initializeSentry)
  .catch(() => {});
