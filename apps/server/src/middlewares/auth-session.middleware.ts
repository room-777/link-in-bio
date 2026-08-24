import { getAuthSession } from "@core/auth";
import { createMiddleware } from "hono/factory";

const shouldResolveSession = (
	request: Request,
) => {
	const url = new URL(request.url);
	const path = url.pathname;

	if (
		path === "/auth" ||
		path.startsWith("/auth/")
	)
		return false;
	if (path === "/health") return false;
	if (
		request.method === "GET" &&
		/^\/pages\/[^/]+$/.test(path) &&
		path !== "/pages/me" &&
		path !== "/pages/check"
	)
		return false;
	return true;
};

export const authSessionMiddleware =
	createMiddleware(async (c, next) => {
		const authSession =
			shouldResolveSession(c.req.raw)
				? await getAuthSession(
						c.req.raw.headers,
						c.env,
						c.get("db"),
					)
				: null;

		c.set(
			"session",
			authSession?.session ?? null,
		);
		c.set(
			"user",
			authSession?.user ?? null,
		);

		await next();
	});
