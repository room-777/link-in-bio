import { isBuiltin } from "node:module";
import { sentryVitePlugin } from "@sentry/vite-plugin";
import { config } from "dotenv";
import type { Rolldown } from "tsdown";
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
	plugins: [
		...(sourceMapUploadEnabled
			? [
					sentryVitePlugin({
						authToken: process.env.SENTRY_AUTH_TOKEN,
						org: process.env.SENTRY_SERVER_ORG,
						project: process.env.SENTRY_SERVER_PROJECT,
						sourcemaps: {
							filesToDeleteAfterUpload: ["dist/**/*.map"],
						},
					}),
					{
						name: "cloudflare-create-require-url",
						generateBundle(
							this: Rolldown.PluginContext,
							_options: Rolldown.NormalizedOutputOptions,
							bundle: Rolldown.OutputBundle,
						) {
							for (const output of Object.values(bundle)) {
								if (output.type === "chunk") {
									// ponytail: keep this same-length for source maps; update if Rolldown changes its shim.
									output.code = output.code.replaceAll(
										"createRequire(import.meta.url)",
										'createRequire("file:///a.js" )',
									);
								}
							}
						},
					},
				]
			: []),
		{
			name: "cloudflare-worker-bundle-check",
			generateBundle(_options, bundle) {
				const bundleFiles = new Set(Object.keys(bundle));
				const chunks = Object.values(bundle).filter(
					(output) => output.type === "chunk",
				);
				const unresolvedImports = new Set(
					chunks
						.flatMap((chunk) => [...chunk.imports, ...chunk.dynamicImports])
						.filter(
							(id) =>
								!id.startsWith(".") &&
								!id.startsWith("cloudflare:") &&
								!bundleFiles.has(id) &&
								!isBuiltin(id),
						),
				);
				if (unresolvedImports.size > 0) {
					this.error(
						`Worker bundle has unresolved package imports: ${[...unresolvedImports].join(", ")}`,
					);
				}

				// pg only loads this optional native addon when its native mode is enabled.
				const unresolvedRequires = new Set(
					chunks
						.flatMap((chunk) =>
							Array.from(
								chunk.code.matchAll(/__require\(["']([^"']+)["']\)/g),
								(match) => match[1] ?? "",
							),
						)
						.filter(
							(id) =>
								!id.startsWith(".") && !isBuiltin(id) && id !== "pg-native",
						),
				);
				if (unresolvedRequires.size > 0) {
					this.error(
						`Worker bundle has unresolved dynamic requires: ${[...unresolvedRequires].join(", ")}`,
					);
				}

				const moduleIds = chunks.flatMap((chunk) => Object.keys(chunk.modules));
				const pgCloudflareModules = moduleIds.filter((id) =>
					id.includes("/pg-cloudflare/"),
				);
				if (
					pgCloudflareModules.some((id) => id.endsWith("/dist/empty.js")) ||
					!pgCloudflareModules.some((id) => id.endsWith("/dist/index.js"))
				) {
					this.error(
						"Worker bundle must include pg-cloudflare's Cloudflare socket implementation.",
					);
				}
			},
		},
	],
	inputOptions: {
		resolve: {
			conditionNames: ["workerd"],
		},
	},
	deps: {
		alwaysBundle: [
			/@grabbin\/.*/,
			/^(?:@sentry\/|aws4fetch$|better-auth(?:\/|$)|drizzle-orm(?:\/|$)|evlog(?:\/|$)|hono(?:\/|$)|rss-parser$|tldts(?:-core)?(?:\/|$)|valibot(?:\/|$))/,
		],
		neverBundle: ["cloudflare:workers"],
	},
});
