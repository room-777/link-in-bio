import type { AppEnv } from "@core/app-factory";
import { handleAuthRequest } from "@core/auth";
import type { SessionResponse } from "@grabbin/api";
import type {
	Context,
	TypedResponse,
} from "hono";
import { Hono } from "hono";

const handleAuth = async (
	c: Context<AppEnv>,
) => {
	if (
		c.req.path ===
			"/auth/get-session" &&
		!c.req.header("cookie")
	)
		return c.json(null, 200);

	const executionCtx = (() => {
		try {
			return c.executionCtx;
		} catch {
			// ponytail: app.request() does not provide ExecutionContext, but Better Auth only needs waitUntil when available.
			return {
				waitUntil: () => undefined,
			};
		}
	})();

	return handleAuthRequest(
		c.req.raw,
		c.env,
		executionCtx,
		c.get("db"),
	);
};

const handleSession = async (
	c: Context<AppEnv>,
) =>
	(await handleAuth(
		c,
	)) as unknown as TypedResponse<
		SessionResponse,
		200,
		"json"
	>;

export const authController =
	new Hono<AppEnv>()
		.get("/get-session", handleSession)
		.get("/:path{.+}", handleAuth)
		.post("/:path{.+}", handleAuth)
		.patch("/:path{.+}", handleAuth)
		.delete("/:path{.+}", handleAuth);
