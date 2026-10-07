import { Hono } from "hono";
import type { AppEnv } from "../types";

export const localMediaController = new Hono<AppEnv>().get("/*", async (c) => {
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
