import { createEnv } from "@t3-oss/env-nextjs";
import * as v from "valibot";

export const env = createEnv({
	client: {
		NEXT_PUBLIC_SERVER_URL: v.pipe(v.string(), v.url()),
		NEXT_PUBLIC_CREEM_PRODUCT_ID: v.optional(v.string()),
		NEXT_PUBLIC_SENTRY_DSN: v.optional(v.pipe(v.string(), v.url())),
	},
	server: {
		SENTRY_DSN: v.optional(v.pipe(v.string(), v.url())),
		SENTRY_AUTH_TOKEN: v.optional(v.string()),
		SENTRY_WEB_ORG: v.optional(v.string()),
		SENTRY_WEB_PROJECT: v.optional(v.string()),
	},
	runtimeEnv: {
		NEXT_PUBLIC_SERVER_URL: process.env.NEXT_PUBLIC_SERVER_URL,
		NEXT_PUBLIC_CREEM_PRODUCT_ID: process.env.NEXT_PUBLIC_CREEM_PRODUCT_ID,
		NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
		SENTRY_DSN: process.env.SENTRY_DSN,
		SENTRY_AUTH_TOKEN: process.env.SENTRY_AUTH_TOKEN,
		SENTRY_WEB_ORG: process.env.SENTRY_WEB_ORG,
		SENTRY_WEB_PROJECT: process.env.SENTRY_WEB_PROJECT,
	},
	emptyStringAsUndefined: true,
});
