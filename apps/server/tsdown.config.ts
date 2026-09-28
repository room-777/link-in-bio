import { sentryVitePlugin } from "@sentry/vite-plugin";
import { config } from "dotenv";
import { defineConfig } from "tsdown";

config({ path: "./.env" });
if (process.env.NODE_ENV === "production") {
	config({ path: "./.env.production" });
}

const sourceMapUploadEnabled = process.env.SENTRY_UPLOAD_SOURCE_MAPS === "1";
if (
	sourceMapUploadEnabled &&
	(!process.env.SENTRY_AUTH_TOKEN ||
		!process.env.SENTRY_SERVER_ORG ||
		!process.env.SENTRY_SERVER_PROJECT)
) {
	throw new Error(
		"SENTRY_AUTH_TOKEN, SENTRY_SERVER_ORG, and SENTRY_SERVER_PROJECT are required when source map upload is enabled.",
	);
}

export default defineConfig({
	entry: "./src/index.ts",
	format: "esm",
	outDir: "./dist",
	clean: true,
	dts: false,
	sourcemap: sourceMapUploadEnabled ? "hidden" : false,
	plugins: sourceMapUploadEnabled
		? [
				sentryVitePlugin({
					authToken: process.env.SENTRY_AUTH_TOKEN,
					org: process.env.SENTRY_SERVER_ORG,
					project: process.env.SENTRY_SERVER_PROJECT,
					sourcemaps: {
						filesToDeleteAfterUpload: ["dist/**/*.map"],
					},
				}),
			]
		: [],
	deps: {
		alwaysBundle: [
			/@grabbin\/.*/,
			/^(?:@sentry\/|aws4fetch$|better-auth(?:\/|$)|drizzle-orm(?:\/|$)|evlog(?:\/|$)|hono(?:\/|$)|valibot(?:\/|$))/,
		],
		neverBundle: ["cloudflare:workers"],
	},
});
