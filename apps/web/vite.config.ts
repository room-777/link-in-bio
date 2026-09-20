import { cloudflare } from "@cloudflare/vite-plugin";
import { sentryVitePlugin } from "@sentry/vite-plugin";
import { cdnAdapter } from "@vinext/cloudflare/cache/cdn-adapter";
import { imagesOptimizer } from "@vinext/cloudflare/images/images-optimizer";
import vinext from "vinext";
import { defineConfig } from "vite";

const sourceMapUploadEnabled = process.env.SENTRY_UPLOAD_SOURCE_MAPS === "1";
if (
	sourceMapUploadEnabled &&
	(!process.env.SENTRY_AUTH_TOKEN ||
		!process.env.SENTRY_WEB_ORG ||
		!process.env.SENTRY_WEB_PROJECT)
) {
	throw new Error(
		"SENTRY_AUTH_TOKEN, SENTRY_WEB_ORG, and SENTRY_WEB_PROJECT are required when source map upload is enabled.",
	);
}

export default defineConfig({
	server: {
		port: 3000,
		strictPort: true,
	},
	build: {
		sourcemap: sourceMapUploadEnabled ? "hidden" : false,
	},
	environments: {
		rsc: {
			optimizeDeps: {
				include: [
					"use-sync-external-store/shim",
					"use-sync-external-store/shim/with-selector",
				],
				exclude: ["@base-ui/react", "@tanstack/react-query"],
			},
		},
		ssr: {
			optimizeDeps: {
				include: [
					"use-sync-external-store/shim",
					"use-sync-external-store/shim/with-selector",
				],
				exclude: ["@base-ui/react", "@tanstack/react-query"],
			},
		},
		client: {
			optimizeDeps: {
				include: [
					"use-sync-external-store/shim",
					"use-sync-external-store/shim/with-selector",
				],
				exclude: ["@tanstack/react-query"],
			},
		},
	},
	plugins: [
		vinext({
			cache: { cdn: cdnAdapter() },
			images: { optimizer: imagesOptimizer() },
		}),
		process.env.ALCHEMY_CLOUDFLARE_VITE_INJECTED === "1"
			? undefined
			: cloudflare({
					viteEnvironment: {
						name: "rsc",
						childEnvironments: ["ssr"],
					},
				}),
		sourceMapUploadEnabled
			? sentryVitePlugin({
					authToken: process.env.SENTRY_AUTH_TOKEN,
					org: process.env.SENTRY_WEB_ORG,
					project: process.env.SENTRY_WEB_PROJECT,
					sourcemaps: {
						filesToDeleteAfterUpload: ["dist/**/*.map"],
					},
				})
			: undefined,
	],
});
