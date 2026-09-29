import { readdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { cloudflare } from "@cloudflare/vite-plugin";
import mdx from "@mdx-js/rollup";
import { sentryVitePlugin } from "@sentry/vite-plugin";
import { cdnAdapter } from "@vinext/cloudflare/cache/cdn-adapter";
import { imagesOptimizer } from "@vinext/cloudflare/images/images-optimizer";
import remarkFrontmatter from "remark-frontmatter";
import remarkMdxFrontmatter from "remark-mdx-frontmatter";
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

export default defineConfig(({ command }) => ({
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
		{
			...mdx({ remarkPlugins: [remarkFrontmatter, remarkMdxFrontmatter] }),
			enforce: "pre",
		},
		vinext({
			...(command === "build" ? { cache: { cdn: cdnAdapter() } } : {}),
			images: { optimizer: imagesOptimizer() },
		}),
		{
			name: "grabbin:cdn-cacheability-manifest",
			buildApp: {
				order: "post",
				async handler(builder) {
					if (command !== "build") return;
					const outputDir = resolve(builder.config.root, "dist/server");
					const buildId = (
						await readFile(resolve(outputDir, "BUILD_ID"), "utf8")
					).trim();
					const updateFiles = await readdir(
						resolve(builder.config.root, "src/content/updates"),
					);
					const updatePaths = updateFiles
						.filter((file) => file.endsWith(".mdx"))
						.map((file) => `/update/${file.slice(0, -4)}`)
						.sort();
					const routes: Record<string, unknown> = {};
					for (const pattern of ["/", "/privacy", "/terms", "/update"]) {
						routes[JSON.stringify(["app-page", pattern])] = {
							kind: "app-page",
							pattern,
							state: "runtime-check",
						};
					}
					if (updatePaths.length > 0) {
						routes[JSON.stringify(["app-page", "/update/:slug"])] = {
							kind: "app-page",
							pattern: "/update/:slug",
							state: "runtime-check",
							runtimePaths: updatePaths,
						};
					}
					const manifest = JSON.stringify({ buildId, routes, version: 1 });
					await writeFile(
						resolve(outputDir, "__vinext_cacheability_manifest.js"),
						`export default ${JSON.stringify(manifest)};\n`,
					);
				},
			},
		},
		cloudflare({
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
}));
