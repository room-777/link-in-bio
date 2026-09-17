import type { DatabaseClient } from "@grabbin/db";
import type { EvlogVariables } from "evlog/hono";

export type AppSession = {
	user: {
		id: string;
	};
};

export type AppEnv = EvlogVariables & {
	Bindings: {
		SENTRY_DSN: string;
	};
	Variables: {
		db: DatabaseClient;
		session: AppSession | null;
	};
};
