import { createMiddleware } from "hono/factory";
import { languageDetector } from "hono/language";

const detectLanguage = languageDetector(
	{
		supportedLanguages: ["en", "ko"],
		fallbackLanguage: "en",
	},
);

export const languageMiddleware =
	createMiddleware(async (c, next) => {
		if (
			c.req.path.startsWith("/auth/")
		) {
			await next();
			return;
		}

		await detectLanguage(c, next);
	});
