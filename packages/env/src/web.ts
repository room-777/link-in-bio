import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
	client: {
		NEXT_PUBLIC_SERVER_URL: z.url(),
		NEXT_PUBLIC_CREEM_PRODUCT_ID: z.string().optional(),
		NEXT_PUBLIC_SENTRY_DSN: z.url().optional(),
	},
	server: {
		SENTRY_DSN: z.url().optional(),
		SENTRY_AUTH_TOKEN: z.string().optional(),
		SENTRY_WEB_ORG: z.string().optional(),
		SENTRY_WEB_PROJECT: z.string().optional(),
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
