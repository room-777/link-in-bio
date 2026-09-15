import * as Sentry from "@sentry/cloudflare";

// OpenNext generates this handler before Wrangler builds the Worker.
// biome-ignore lint/suspicious/noTsIgnore: OpenNext generates this module during the build.
// @ts-ignore OpenNext output is generated during the build.
import generatedWorker, { BucketCachePurge, DOQueueHandler, DOShardedTagCache } from "../.open-next/worker.js";

// OpenNext's Durable Objects must remain visible to Wrangler.
export { BucketCachePurge, DOQueueHandler, DOShardedTagCache };

export default Sentry.withSentry(
  (env: CloudflareEnv) => ({
    dsn: env.SENTRY_DSN,
    tracesSampleRate: 1.0,
    enableLogs: true,
    enableMetrics: true,
    integrations: [
      Sentry.consoleLoggingIntegration({
        levels: ["log", "warn", "error"],
      }),
    ],
    _flushInterval: 0,
  }),
  generatedWorker,
);
