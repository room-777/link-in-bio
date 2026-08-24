import { createDatabaseClient } from "@db/index";
import { createMiddleware } from "hono/factory";

export const dbMiddleware = createMiddleware(
	async (c, next) => {
		const path = new URL(c.req.url).pathname;
		const isAnonymousSessionProbe =
			path === "/auth/get-session" &&
			!c.req.header("cookie");
		if (
			path === "/health" ||
			isAnonymousSessionProbe
		) {
			await next();
			return;
		}

		c.set(
			"db",
			createDatabaseClient(c.env),
		);

		await next();
	},
);
