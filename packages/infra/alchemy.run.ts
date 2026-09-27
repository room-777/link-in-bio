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

const databaseOrigin = Config.redacted("DATABASE_URL").pipe(
	Config.map(parseDatabaseOrigin),
	Effect.orDie,
);

const databaseLocalOrigin = Config.redacted("DATABASE_URL_LOCAL").pipe(
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
}).pipe(Alchemy.remote());

export const server = Cloudflare.Worker("server", {
	main: serverUsesUploadedBuild
		? "../../apps/server/dist/index.mjs"
		: "../../apps/server/src/index.ts",
	bundle: !serverUsesUploadedBuild,
	domain: "api.grabbin.me",
	compatibility: {
		flags: ["nodejs_compat"],
	},
	crons: ["0 6 * * *"],
	env: {
		HYPERDRIVE: hyperdrive,
		R2_BUCKET: grabbinBucket,
		R2_PUBLIC_URL: Config.string("R2_PUBLIC_URL").pipe(
			Config.orElse(() => Config.string("NEXT_PUBLIC_R2_PUBLIC_URL")),
			Config.withDefault(""),
		),
		R2_ACCOUNT_ID: Config.string("R2_ACCOUNT_ID"),
		R2_BUCKET_NAME: Config.string("R2_BUCKET_NAME").pipe(
			Config.withDefault("grabbin"),
		),
		R2_ACCESS_KEY_ID: Config.string("R2_ACCESS_KEY_ID"),
		R2_SECRET_ACCESS_KEY: Config.redacted("R2_SECRET_ACCESS_KEY"),
		CORS_ORIGIN: Config.string("CORS_ORIGIN"),
		SENTRY_DSN: Config.string("SENTRY_DSN").pipe(Config.withDefault("")),
		BETTER_AUTH_SECRET: Config.redacted("BETTER_AUTH_SECRET"),
		BETTER_AUTH_URL: Cloudflare.Worker.URL,
		GOOGLE_CLIENT_ID: Config.string("GOOGLE_CLIENT_ID").pipe(
			Config.withDefault(""),
		),
		GOOGLE_CLIENT_SECRET: Config.redacted("GOOGLE_CLIENT_SECRET").pipe(
			Config.withDefault(""),
		),
		GITHUB_CLIENT_ID: Config.string("GITHUB_CLIENT_ID").pipe(
			Config.withDefault(""),
		),
		GITHUB_CLIENT_SECRET: Config.redacted("GITHUB_CLIENT_SECRET").pipe(
			Config.withDefault(""),
		),
		TWITTER_CLIENT_ID: Config.string("TWITTER_CLIENT_ID").pipe(
			Config.withDefault(""),
		),
		TWITTER_CLIENT_SECRET: Config.redacted("TWITTER_CLIENT_SECRET").pipe(
			Config.withDefault(""),
		),
		CREEM_API_KEY: Config.redacted("CREEM_API_KEY"),
		CREEM_WEBHOOK_SECRET: Config.redacted("CREEM_WEBHOOK_SECRET"),
		CREEM_TEST_MODE: Config.string("CREEM_TEST_MODE"),
		CREEM_SUCCESS_URL: Config.string("CREEM_SUCCESS_URL"),
		CREEM_PRO_MONTHLY_PRODUCT_ID: Config.string(
			"CREEM_PRO_MONTHLY_PRODUCT_ID",
		).pipe(Config.withDefault("")),
		CREEM_PRO_YEARLY_PRODUCT_ID: Config.string(
			"CREEM_PRO_YEARLY_PRODUCT_ID",
		).pipe(Config.withDefault("")),
		RESEND_API_KEY: Config.redacted("RESEND_API_KEY").pipe(
			Config.withDefault(""),
		),
		RESEND_FROM_EMAIL: Config.string("RESEND_FROM_EMAIL").pipe(
			Config.withDefault(""),
		),
		YOUTUBE_API_KEY: Config.string("YOUTUBE_API_KEY").pipe(
			Config.withDefault(""),
		),
		CHZZK_CLIENT_ID: Config.string("CHZZK_CLIENT_ID").pipe(
			Config.withDefault(""),
		),
		CHZZK_CLIENT_SECRET: Config.redacted("CHZZK_CLIENT_SECRET").pipe(
			Config.withDefault(""),
		),
		TWITCH_CLIENT_ID: Config.string("TWITCH_CLIENT_ID").pipe(
			Config.withDefault(""),
		),
		TWITCH_CLIENT_SECRET: Config.redacted("TWITCH_CLIENT_SECRET").pipe(
			Config.withDefault(""),
		),
		TWITCH_USER_ACCESS_TOKEN: Config.redacted("TWITCH_USER_ACCESS_TOKEN").pipe(
			Config.withDefault(""),
		),
		GITHUB_TOKEN: Config.redacted("GITHUB_TOKEN").pipe(Config.withDefault("")),
		PRODUCT_HUNT_TOKEN: Config.redacted("PRODUCT_HUNT_TOKEN").pipe(
			Config.withDefault(""),
		),
		SIMPLE_ANALYTICS_API_KEY: Config.redacted("SIMPLE_ANALYTICS_API_KEY").pipe(
			Config.withDefault(""),
		),
		NEXT_PUBLIC_PAGE_DOMAIN: Config.string("NEXT_PUBLIC_PAGE_DOMAIN").pipe(
			Config.withDefault("grabbin.me"),
		),
	},
	dev: {
		port: 3001,
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
		if (isAlchemyDev) {
			yield* Command.Dev("web-dev", {
				command: "bun run dev:bare",
				cwd: "../../apps/web",
				env: {
					NEXT_PUBLIC_SERVER_URL: serverWorker.url.as<string>(),
				},
			});
			return {
				web: new URL("http://localhost:3000"),
				server: serverWorker.url,
			};
		}

		const webWorker = yield* Cloudflare.Website.Vite("web", {
			domain: "grabbin.me",
			rootDir: "../../apps/web",
			dev: { port: 3000 },
			viteEnvironments: {
				entry: "rsc",
				children: ["ssr"],
			},
			compatibility: {
				flags: ["nodejs_compat", "global_fetch_strictly_public"],
			},
			env: {
				IMAGES: Cloudflare.Images.Images(),
				SERVER: serverWorker,
				NEXT_PUBLIC_SERVER_URL: serverWorker.url.as<string>(),
				NEXT_PUBLIC_PAGE_DOMAIN: Config.string("NEXT_PUBLIC_PAGE_DOMAIN").pipe(
					Config.withDefault("grabbin.me"),
				),
				NEXT_PUBLIC_R2_PUBLIC_URL: Config.string(
					"NEXT_PUBLIC_R2_PUBLIC_URL",
				).pipe(Config.withDefault("")),
				NEXT_PUBLIC_CREEM_PRODUCT_ID: Config.string(
					"NEXT_PUBLIC_CREEM_PRODUCT_ID",
				).pipe(Config.withDefault("")),
				NEXT_PUBLIC_CREEM_PRO_MONTHLY_PRODUCT_ID: Config.string(
					"CREEM_PRO_MONTHLY_PRODUCT_ID",
				).pipe(Config.withDefault("")),
				NEXT_PUBLIC_CREEM_PRO_YEARLY_PRODUCT_ID: Config.string(
					"CREEM_PRO_YEARLY_PRODUCT_ID",
				).pipe(Config.withDefault("")),
				SENTRY_DSN: Config.string("SENTRY_DSN").pipe(Config.withDefault("")),
				NEXT_PUBLIC_SENTRY_DSN: Config.string("NEXT_PUBLIC_SENTRY_DSN").pipe(
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
