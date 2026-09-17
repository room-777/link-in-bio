import { createAuth } from "@grabbin/auth";
import { createDb } from "@grabbin/db";
import { createMiddleware } from "hono/factory";

import { jsonApiError } from "../api-error";
import type { AppEnv } from "../types";

async function getSession(
	request: Request,
	db: Awaited<ReturnType<typeof createDb>>,
) {
	return (await createAuth(db)).api.getSession({ headers: request.headers });
}

export const optionalSession = createMiddleware<AppEnv>(async (c, next) => {
	const db = await createDb();
	c.set("db", db);
	c.set("session", await getSession(c.req.raw, db));
	await next();
});

export const requiredSession = createMiddleware<AppEnv>(async (c, next) => {
	const db = await createDb();
	const session = await getSession(c.req.raw, db);
	if (!session) {
		return jsonApiError(c, {
			status: 401,
			detail: "Authentication required.",
		});
	}

	c.set("db", db);
	c.set("session", session);
	await next();
});
