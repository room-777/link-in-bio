import { getAllowedOrigins } from "@core/origins";
import { csrf } from "hono/csrf";

export const csrfMiddleware = csrf({
	origin: (origin, c) =>
		getAllowedOrigins(
			c.env?.FRONTEND_URL,
		).includes(origin),
});
