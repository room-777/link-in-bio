import { getAllowedOrigins } from "@core/origins";
import { cors } from "hono/cors";

export const corsMiddleware = cors({
	origin: (origin, c) => {
		return getAllowedOrigins(
			c.env?.FRONTEND_URL,
		).includes(origin)
			? origin
			: undefined;
	},
	allowHeaders: [
		"Accept",
		"Content-Type",
		"Authorization",
		"X-CSRF-Token",
		"X-Client-Version",
		"X-Requested-With",
		"Api-Key",
	],
	allowMethods: [
		"GET",
		"HEAD",
		"POST",
		"PUT",
		"PATCH",
		"DELETE",
		"OPTIONS",
	],
	exposeHeaders: ["Content-Length"],
	maxAge: 600,
	credentials: true,
});
