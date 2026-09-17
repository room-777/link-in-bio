import * as Alchemy from "alchemy";
import * as Cloudflare from "alchemy/Cloudflare";
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
		Effect.map(([origin, dev]) => ({ origin, dev: dev ?? origin })),
	),
);

export const server = Cloudflare.Worker("server", {
	main: serverUsesUploadedBuild
		? "../../apps/server/dist/index.mjs"
		: "../../apps/server/src/index.ts",
	bundle: !serverUsesUploadedBuild,
	// Uncomment the custom domain setting below to configure a custom domain.
	// domain: "api.example.com",
	compatibility: {
		flags: ["nodejs_compat"],
	},
	env: {
		HYPERDRIVE: hyperdrive,
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
		RESEND_API_KEY: Config.redacted("RESEND_API_KEY").pipe(
			Config.withDefault(""),
		),
		RESEND_FROM_EMAIL: Config.string("RESEND_FROM_EMAIL").pipe(
			Config.withDefault(""),
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
			return {
				web: new URL("http://localhost:3000"),
				server: serverWorker.url,
			};
		}

		const webWorker = yield* Cloudflare.Website.Vite("web", {
			// Uncomment the custom domain setting below to configure a custom domain.
			// domain: "app.example.com",
			rootDir: "../../apps/web",
			dev: {
				port: 3000,
			},
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
				NEXT_PUBLIC_CREEM_PRODUCT_ID: Config.string(
					"NEXT_PUBLIC_CREEM_PRODUCT_ID",
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
