import type {
	AuthSessionData,
	AuthUser,
} from "@core/auth";
import type { DatabaseClient } from "@db/index";
import type { pages } from "@db/schema";
import { authSessionMiddleware } from "@middlewares/auth-session.middleware";
import { corsMiddleware } from "@middlewares/cors.middleware";
import { csrfMiddleware } from "@middlewares/csrf.middleware";
import { dbMiddleware } from "@middlewares/db.middleware";
import { languageMiddleware } from "@middlewares/language.middleware";
import { loggerMiddleware } from "@middlewares/logger.middleware";
import { prettyJsonMiddleware } from "@middlewares/pretty-json.middleware";
import { requestIdMiddleware } from "@middlewares/request-id.middleware";
import { secureHeadersMiddleware } from "@middlewares/secure-headers.middleware";
import { timeoutMiddleware } from "@middlewares/timeout.middleware";
import { timingMiddleware } from "@middlewares/timing.middleware";
import { createFactory } from "hono/factory";
import type { AppBindings } from "types/type";

export type AppEnv = {
	Bindings: AppBindings;
	Variables: {
		db: DatabaseClient;
		session: AuthSessionData | null;
		user: AuthUser | null;
		authenticatedUser: AuthUser;
		ownedPage: typeof pages.$inferSelect;
	};
};

export const appFactory =
	createFactory<AppEnv>({
		initApp: (app) => {
			app.use("*", requestIdMiddleware);
			app.use("*", timingMiddleware);
			app.use("*", timeoutMiddleware);
			app.use(
				"*",
				secureHeadersMiddleware,
			);
			app.use("*", corsMiddleware);
			app.use("*", csrfMiddleware);
			app.use("*", dbMiddleware);
			app.use(
				"*",
				authSessionMiddleware,
			);
			app.use(
				"*",
				prettyJsonMiddleware,
			);
			app.use("*", languageMiddleware);
			app.use(loggerMiddleware);
		},
	});
