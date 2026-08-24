import type { AppEnv } from "@core/app-factory";
import { createMiddleware } from "hono/factory";
import { UnauthorizedError } from "../exceptions/http-exceptions";
import { assertOwnedPage } from "../services/page.service";
import { assertPageWritable } from "../services/page-lifecycle.service";

export const requireAuthenticatedUser =
	createMiddleware<AppEnv>(
		async (c, next) => {
			const user = c.get("user");
			if (!user)
				throw new UnauthorizedError();
			c.set("authenticatedUser", user);
			await next();
		},
	);

export const requireWritableOwnedPage =
	createMiddleware<AppEnv>(
		async (c, next) => {
			const user = c.get("user");
			if (!user)
				throw new UnauthorizedError();
			const page =
				await assertOwnedPage(
					c.get("db"),
					c.req.param("handle") ?? "",
					user.id,
				);
			await assertPageWritable({
				db: c.get("db"),
				userId: user.id,
				page,
			});
			c.set("authenticatedUser", user);
			c.set("ownedPage", page);
			await next();
		},
	);
