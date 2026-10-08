import { providerDefinitionList } from "@grabbin/page-link";
import { Hono } from "hono";

import type { AppEnv } from "../types";

const providerIconKey = (provider: string, extension: "svg" | "webp") =>
	`provider-icons/v1/${provider}.${extension}`;

export const providerIconsController = new Hono<AppEnv>().get(
	"/:provider",
	async (c) => {
		const rawProvider = c.req.param("provider");
		const extension = rawProvider.endsWith(".webp") ? "webp" : "svg";
		const provider = rawProvider.replace(/\.(?:svg|webp)$/, "");
		if (!providerDefinitionList.some(({ id }) => id === provider)) {
			return new Response("Provider icon not found.", { status: 404 });
		}

		let object: R2ObjectBody | null;
		try {
			object = await c.env.R2_BUCKET.get(providerIconKey(provider, extension));
		} catch {
			return new Response("Provider icon storage is unavailable.", {
				status: 503,
			});
		}
		if (!object) {
			return new Response("Provider icon not found.", { status: 404 });
		}

		const headers = new Headers({
			"Cache-Control": "public, max-age=31536000, immutable",
			"Content-Type": extension === "webp" ? "image/webp" : "image/svg+xml",
			"X-Content-Type-Options": "nosniff",
		});
		if (object.httpEtag) headers.set("ETag", object.httpEtag);
		if (c.req.header("If-None-Match") === object.httpEtag) {
			return new Response(null, { status: 304, headers });
		}

		return new Response(object.body, { headers });
	},
);
