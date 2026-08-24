import { timeout } from "hono/timeout";

export const timeoutMiddleware =
	timeout(30_000);
