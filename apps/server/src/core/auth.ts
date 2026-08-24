import { AsyncLocalStorage } from "node:async_hooks";
import {
	createDatabaseClient,
	type DatabaseClient,
} from "@db/index";
import * as schema from "@db/schema";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { betterAuth } from "better-auth/minimal";
import type { ExecutionContext } from "hono";
import type { AppBindings } from "types/type";
import { betterAuthOptions } from "./auth.options";
import { getAllowedOrigins } from "./origins";

type AuthExecutionContext = {
	waitUntil: ExecutionContext["waitUntil"];
};

const authExecutionContext =
	new AsyncLocalStorage<AuthExecutionContext>();

export const createAuth = (
	env: AppBindings,
	db = createDatabaseClient(env),
) => {
	return betterAuth({
		...betterAuthOptions(env, {
			db,
			backgroundTaskHandler: (
				promise,
			) =>
				authExecutionContext
					.getStore()
					?.waitUntil(promise),
		}),
		database: drizzleAdapter(db, {
			provider: "pg",
			schema: {
				...schema,
				creem_subscription:
					schema.creemSubscription,
			},
		}),
		baseURL: env.BETTER_AUTH_URL,
		secret: env.BETTER_AUTH_SECRET,
		trustedOrigins: [
			...getAllowedOrigins(
				env.FRONTEND_URL,
			),
			env.BETTER_AUTH_URL,
		],
	});
};

export type AuthInstance = ReturnType<
	typeof createAuth
>;
export type AuthSession =
	AuthInstance["$Infer"]["Session"];
export type AuthUser =
	AuthSession["user"];
export type AuthSessionData =
	AuthSession["session"];

export const getAuthSession = (
	headers: Headers,
	env?: AppBindings,
	db?: DatabaseClient,
) => {
	if (!env) {
		return Promise.resolve(null);
	}

	return createAuth(
		env,
		db,
	).api.getSession({ headers });
};

export const handleAuthRequest = (
	request: Request,
	env: AppBindings,
	executionCtx: AuthExecutionContext,
	db?: DatabaseClient,
) =>
	authExecutionContext.run(
		executionCtx,
		() =>
			createAuth(env, db).handler(
				request,
			),
	);
