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
		R2_BUCKET: R2Bucket;
		R2_ACCOUNT_ID: string;
		R2_BUCKET_NAME: string;
		R2_ACCESS_KEY_ID: string;
		R2_SECRET_ACCESS_KEY: string;
	};
	Variables: {
		db: DatabaseClient;
		session: AppSession | null;
	};
};
