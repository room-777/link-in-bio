import type { DatabaseClient } from "@grabbin/db";
import type { EvlogVariables } from "evlog/hono";

export type AppSession = {
	user: {
		id: string;
		email: string;
	};
};

export type AppEnv = EvlogVariables & {
	Bindings: {
		SENTRY_DSN: string;
		R2_BUCKET: R2Bucket;
		R2_PUBLIC_URL: string;
		R2_ACCOUNT_ID: string;
		R2_BUCKET_NAME: string;
		R2_ACCESS_KEY_ID: string;
		R2_SECRET_ACCESS_KEY: string;
		YOUTUBE_API_KEY: string;
		CHZZK_CLIENT_ID: string;
		CHZZK_CLIENT_SECRET: string;
		CREEM_API_KEY: string;
		CREEM_TEST_MODE: string;
		CREEM_SUCCESS_URL: string;
		CREEM_PRO_MONTHLY_PRODUCT_ID: string;
		CREEM_PRO_YEARLY_PRODUCT_ID: string;
		TWITCH_CLIENT_ID: string;
		TWITCH_CLIENT_SECRET: string;
		TWITCH_USER_ACCESS_TOKEN: string;
		GITHUB_TOKEN: string;
		PRODUCT_HUNT_TOKEN: string;
		PAGE_DOMAIN: string;
	};
	Variables: {
		db: DatabaseClient;
		session: AppSession | null;
	};
};
