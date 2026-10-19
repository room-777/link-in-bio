import { Hono } from "hono";
import type { AppEnv } from "../types";

export const localMediaController = new Hono<AppEnv>()
	.put("/*", async (c) => {
		const segments = c.req.path.replace(/^\/media\//, "").split("/");
		const bucketName = segments.shift();
		const key = segments.join("/");
		if (
			c.env.R2_LOCAL_MODE !== "true" ||
			bucketName !== "featuremap-agent-local" ||
			!key.startsWith("users/") ||
			key.includes("..") ||
			key.includes("\\")
		) {
			return new Response("Media upload not found.", { status: 404 });
		}

		const body = await c.req.arrayBuffer();
		if (body.byteLength === 0 || body.byteLength > 25 * 1024 * 1024) {
			return new Response("Media upload size is invalid.", { status: 413 });
		}

		await c.env.R2_BUCKET.put(key, body, {
			httpMetadata: { contentType: c.req.header("content-type") ?? "" },
		});
		return new Response(null, { status: 200 });
	})
	.get("/*", async (c) => {
		const key = c.req.path.replace(/^\/media\//, "");
		if (
			c.env.R2_LOCAL_MODE !== "true" ||
			!key ||
			!key.startsWith("users/") ||
			key.includes("..") ||
			key.includes("\\")
		) {
			return new Response("Media not found.", { status: 404 });
		}

		const object = await c.env.R2_BUCKET.get(key);
		if (!object) return new Response("Media not found.", { status: 404 });

		const headers = new Headers({
			"Cache-Control": "no-store",
			"Content-Type":
				object.httpMetadata?.contentType ?? "application/octet-stream",
			"X-Content-Type-Options": "nosniff",
		});
		if (object.httpEtag) headers.set("ETag", object.httpEtag);
		return new Response(object.body, { headers });
	});
