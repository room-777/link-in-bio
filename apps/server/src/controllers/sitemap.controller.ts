import { Hono } from "hono";

import type { AppEnv } from "../types";

export function createSitemapController(loadHandles: () => Promise<string[]>) {
	return new Hono<AppEnv>().get("/", async (c) => {
		c.header("Cache-Control", "public, max-age=3600");
		return c.json({ handles: await loadHandles() });
	});
}
