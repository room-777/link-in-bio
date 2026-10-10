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
		R2_S3_CREDENTIALS: string;
		R2_PUBLIC_URL: string;
		R2_LOCAL_MODE: string;
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
		CALENDLY_CLIENT_ID: string;
		CALENDLY_CLIENT_SECRET: string;
		GITHUB_TOKEN: string;
		PRODUCT_HUNT_TOKEN: string;
		INSTAGRAM_SESSION_ID?: string;
		PAGE_DOMAIN: string;
		CLOUDFLARE_SAAS_ZONE_ID?: string;
		CLOUDFLARE_SAAS_API_TOKEN?: string;
		CUSTOM_DOMAIN_TARGET?: string;
	};
	Variables: {
		db: DatabaseClient;
		session: AppSession | null;
	};
};
