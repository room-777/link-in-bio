import * as Alchemy from "alchemy";
import * as Cloudflare from "alchemy/Cloudflare";
import * as Command from "alchemy/Command";
import { config } from "dotenv";
import * as Config from "effect/Config";
import * as Effect from "effect/Effect";
import * as Redacted from "effect/Redacted";

config({ path: "./.env" });
config({ path: "../../apps/web/.env" });
const isAlchemyDev = process.env.ALCHEMY_DEV === "true";

if (isAlchemyDev || process.env.NODE_ENV !== "production") {
	config({ path: "../../apps/server/.env" });
}
if (!isAlchemyDev && process.env.NODE_ENV === "production") {
	config({ path: "../../apps/server/.env.production" });
	config({ path: "../../apps/web/.env.production" });
}

const serverUsesUploadedBuild = process.env.SENTRY_UPLOAD_SOURCE_MAPS === "1";

const parseDatabaseOrigin = (connectionString: Redacted.Redacted<string>) => {
	const url = new URL(Redacted.value(connectionString));
	const sslmode = [
		"disable",
		"prefer",
		"require",
		"verify-ca",
		"verify-full",
	] as const;
	const configuredSslmode = sslmode.find(
		(value) => value === url.searchParams.get("sslmode"),
	);

	if (url.protocol !== "postgres:" && url.protocol !== "postgresql:") {
		throw new Error("DATABASE_URL must use postgres:// or postgresql://");
	}

	return {
		scheme:
			url.protocol === "postgresql:"
				? ("postgresql" as const)
				: ("postgres" as const),
		host: url.hostname,
		port: url.port ? Number(url.port) : 5432,
		database: decodeURIComponent(url.pathname.replace(/^\//, "")),
		user: decodeURIComponent(url.username),
		password: Redacted.make(decodeURIComponent(url.password)),
		sslmode: configuredSslmode,
	};
};

const databaseOrigin = Config.Redacted("DATABASE_URL").pipe(
	Config.map(parseDatabaseOrigin),
	Effect.orDie,
);

const databaseLocalOrigin = Config.Redacted("DATABASE_URL_LOCAL").pipe(
	Config.map(parseDatabaseOrigin),
	Config.map((origin) => ({
		...origin,
		sslmode: origin.sslmode ?? "disable",
	})),
	Effect.orElseSucceed(() => undefined),
);

export const hyperdrive = Cloudflare.Hyperdrive.Connection(
	"database",
	databaseOrigin.pipe(
		Effect.zip(databaseLocalOrigin),
		Effect.map(([origin, dev]) => ({
			name: "grabbin",
			origin,
			caching: { disabled: true },
			dev: dev ?? origin,
		})),
	),
);

export const grabbinBucket = Cloudflare.R2.Bucket("grabbin", {
	name: "grabbin",
	cors: [
		{
			allowedMethods: ["PUT", "HEAD"],
			allowedOrigins: ["http://localhost:3000", "https://grabbin.me"],
			allowedHeaders: ["content-type"],
			exposeHeaders: ["etag"],
			maxAgeSeconds: 3600,
		},
	],
});

export const server = Cloudflare.Worker("server", {
	name: "grabbin-server",
	placement: { region: "aws:ap-northeast-2" },
	main: serverUsesUploadedBuild
		? "../../apps/server/dist/index.mjs"
		: "../../apps/server/src/index.ts",
	bundle: !serverUsesUploadedBuild,
	domain: "api.grabbin.me",
	compatibility: {
		flags: ["nodejs_compat"],
	},
	env: {
		HYPERDRIVE: hyperdrive,
		R2_BUCKET: grabbinBucket,
		R2_S3_CREDENTIALS: Cloudflare.R2.S3Credentials(grabbinBucket, {
			access: "write",
		}),
		R2_LOCAL_MODE: isAlchemyDev ? "true" : "false",
		R2_PUBLIC_URL: isAlchemyDev
			? Cloudflare.Worker.URL
			: Config.String("R2_PUBLIC_URL").pipe(
					Config.orElse(() => Config.String("NEXT_PUBLIC_R2_PUBLIC_URL")),
					Config.withDefault(""),
				),
		CORS_ORIGIN: Config.String("CORS_ORIGIN"),
		SENTRY_DSN: isAlchemyDev
			? ""
			: Config.String("SENTRY_DSN").pipe(Config.withDefault("")),
		BETTER_AUTH_SECRET: Config.Redacted("BETTER_AUTH_SECRET"),
		BETTER_AUTH_URL: Cloudflare.Worker.URL,
		GOOGLE_CLIENT_ID: Config.String("GOOGLE_CLIENT_ID").pipe(
			Config.withDefault(""),
		),
		GOOGLE_CLIENT_SECRET: Config.Redacted("GOOGLE_CLIENT_SECRET").pipe(
			Config.withDefault(""),
		),
		GITHUB_CLIENT_ID: Config.String("GITHUB_CLIENT_ID").pipe(
			Config.withDefault(""),
		),
		GITHUB_CLIENT_SECRET: Config.Redacted("GITHUB_CLIENT_SECRET").pipe(
			Config.withDefault(""),
		),
		TWITTER_CLIENT_ID: Config.String("TWITTER_CLIENT_ID").pipe(
			Config.withDefault(""),
		),
		TWITTER_CLIENT_SECRET: Config.Redacted("TWITTER_CLIENT_SECRET").pipe(
			Config.withDefault(""),
		),
		CREEM_API_KEY: Config.Redacted("CREEM_API_KEY"),
		CREEM_WEBHOOK_SECRET: Config.Redacted("CREEM_WEBHOOK_SECRET"),
		CREEM_TEST_MODE: Config.String("CREEM_TEST_MODE"),
		CREEM_SUCCESS_URL: Config.String("CREEM_SUCCESS_URL"),
		CREEM_PRO_MONTHLY_PRODUCT_ID: Config.String(
			"CREEM_PRO_MONTHLY_PRODUCT_ID",
		).pipe(Config.withDefault("")),
		CREEM_PRO_YEARLY_PRODUCT_ID: Config.String(
			"CREEM_PRO_YEARLY_PRODUCT_ID",
		).pipe(Config.withDefault("")),
		RESEND_API_KEY: Config.Redacted("RESEND_API_KEY").pipe(
			Config.withDefault(""),
		),
		RESEND_FROM_EMAIL: Config.String("RESEND_FROM_EMAIL").pipe(
			Config.withDefault(""),
		),
		RESEND_OTP_TEMPLATE_ID: Config.String("RESEND_OTP_TEMPLATE_ID").pipe(
			Config.withDefault(""),
		),
		RESEND_ACCOUNT_DELETION_TEMPLATE_ID: Config.String(
			"RESEND_ACCOUNT_DELETION_TEMPLATE_ID",
		).pipe(Config.withDefault("")),
		YOUTUBE_API_KEY: Config.String("YOUTUBE_API_KEY").pipe(
			Config.withDefault(""),
		),
		CHZZK_CLIENT_ID: Config.String("CHZZK_CLIENT_ID").pipe(
			Config.withDefault(""),
		),
		CHZZK_CLIENT_SECRET: Config.Redacted("CHZZK_CLIENT_SECRET").pipe(
			Config.withDefault(""),
		),
		TWITCH_CLIENT_ID: Config.String("TWITCH_CLIENT_ID").pipe(
			Config.withDefault(""),
		),
		TWITCH_CLIENT_SECRET: Config.Redacted("TWITCH_CLIENT_SECRET").pipe(
			Config.withDefault(""),
		),
		TWITCH_USER_ACCESS_TOKEN: Config.Redacted("TWITCH_USER_ACCESS_TOKEN").pipe(
			Config.withDefault(""),
		),
		GITHUB_TOKEN: Config.Redacted("GITHUB_TOKEN").pipe(Config.withDefault("")),
		PRODUCT_HUNT_TOKEN: Config.Redacted("PRODUCT_HUNT_TOKEN").pipe(
			Config.withDefault(""),
		),
		CLOUDFLARE_SAAS_ZONE_ID: Config.String("CLOUDFLARE_SAAS_ZONE_ID").pipe(
			Config.withDefault(""),
		),
		CLOUDFLARE_SAAS_API_TOKEN: Config.Redacted(
			"CLOUDFLARE_SAAS_API_TOKEN",
		).pipe(Config.withDefault("")),
		CUSTOM_DOMAIN_TARGET: Config.String("CUSTOM_DOMAIN_TARGET").pipe(
			Config.withDefault("custom.grabbin.me"),
		),
		PAGE_DOMAIN: Config.String("PAGE_DOMAIN").pipe(
			Config.withDefault("grabbin.me"),
		),
	},
	dev: {
		port: 3001,
	},
});

export const cron = Cloudflare.Worker("cron", {
	name: "grabbin-cron",
	placement: { region: "aws:ap-northeast-2" },
	main: "../../apps/cron/src/index.ts",
	bundle: true,
	compatibility: {
		flags: ["nodejs_compat"],
	},
	crons: ["0 6 * * *"],
	env: {
		HYPERDRIVE: hyperdrive,
		R2_BUCKET: grabbinBucket,
		CREEM_API_KEY: Config.Redacted("CREEM_API_KEY"),
		CREEM_TEST_MODE: Config.String("CREEM_TEST_MODE"),
		CREEM_PRO_MONTHLY_PRODUCT_ID: Config.String(
			"CREEM_PRO_MONTHLY_PRODUCT_ID",
		).pipe(Config.withDefault("")),
		CREEM_PRO_YEARLY_PRODUCT_ID: Config.String(
			"CREEM_PRO_YEARLY_PRODUCT_ID",
		).pipe(Config.withDefault("")),
		CLOUDFLARE_SAAS_ZONE_ID: Config.String("CLOUDFLARE_SAAS_ZONE_ID").pipe(
			Config.withDefault(""),
		),
		CLOUDFLARE_SAAS_API_TOKEN: Config.Redacted(
			"CLOUDFLARE_SAAS_API_TOKEN",
		).pipe(Config.withDefault("")),
		PAGE_DOMAIN: Config.String("PAGE_DOMAIN").pipe(
			Config.withDefault("grabbin.me"),
		),
		CUSTOM_DOMAIN_TARGET: Config.String("CUSTOM_DOMAIN_TARGET").pipe(
			Config.withDefault("custom.grabbin.me"),
		),
	},
});

export type ServerEnv = Cloudflare.InferEnv<typeof server>;

export default Alchemy.Stack(
	"grabbin",
	{
		providers: Cloudflare.providers(),
		state: Cloudflare.state(),
	},
	Effect.gen(function* () {
		const serverWorker = yield* server;
		yield* cron;
		if (isAlchemyDev) {
			yield* Command.Dev("web-dev", {
				command: "bun run dev:bare",
				cwd: "../../apps/web",
				env: {
					NEXT_PUBLIC_SERVER_URL: serverWorker.url.as<string>(),
					NEXT_PUBLIC_R2_PUBLIC_URL: serverWorker.url.as<string>(),
				},
			});
			return {
				web: new URL("http://localhost:3000"),
				server: serverWorker.url,
			};
		}

		const webWorker = yield* Cloudflare.Worker("web", {
			name: "grabbin",
			placement: { region: "aws:ap-northeast-2" },
			domain: "grabbin.me",
			main: "../../apps/web/dist/server/index.js",
			bundle: false,
			assets: "../../apps/web/dist/client",
			cache: { enabled: true, crossVersionCache: false },
			compatibility: {
				flags: ["nodejs_compat", "global_fetch_strictly_public"],
			},
			env: {
				IMAGES: Cloudflare.Images.Images(),
				CF_VERSION_METADATA: Cloudflare.Workers.VersionMetadata(),
				SERVER: serverWorker,
				NEXT_PUBLIC_SERVER_URL: serverWorker.url.as<string>(),
				NEXT_PUBLIC_PAGE_DOMAIN: Config.String("NEXT_PUBLIC_PAGE_DOMAIN").pipe(
					Config.withDefault("grabbin.me"),
				),
				NEXT_PUBLIC_R2_PUBLIC_URL: Config.String(
					"NEXT_PUBLIC_R2_PUBLIC_URL",
				).pipe(Config.withDefault("")),
				NEXT_PUBLIC_CREEM_PRODUCT_ID: Config.String(
					"NEXT_PUBLIC_CREEM_PRODUCT_ID",
				).pipe(Config.withDefault("")),
				NEXT_PUBLIC_CREEM_PRO_MONTHLY_PRODUCT_ID: Config.String(
					"CREEM_PRO_MONTHLY_PRODUCT_ID",
				).pipe(Config.withDefault("")),
				NEXT_PUBLIC_CREEM_PRO_YEARLY_PRODUCT_ID: Config.String(
					"CREEM_PRO_YEARLY_PRODUCT_ID",
				).pipe(Config.withDefault("")),
				SENTRY_DSN: Config.String("NEXT_PUBLIC_SENTRY_DSN").pipe(
					Config.withDefault(""),
				),
				NEXT_PUBLIC_SENTRY_DSN: Config.String("NEXT_PUBLIC_SENTRY_DSN").pipe(
					Config.withDefault(""),
				),
			},
		});

		return {
			web: webWorker.url,
			server: serverWorker.url,
		};
	}),
);
