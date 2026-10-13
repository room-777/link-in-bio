import { Hono } from "hono";
import type { AppEnv } from "../types";

type AuthHandler = (
	request: Request,
	bindings: AppEnv["Bindings"],
) => Promise<Response>;

export function createAuthController(handleAuthRequest: AuthHandler) {
	return new Hono<AppEnv>()
		.get("/get-session", (c) => handleAuthRequest(c.req.raw, c.env))
		.on(["POST", "GET"], "/*", (c) => handleAuthRequest(c.req.raw, c.env));
}
