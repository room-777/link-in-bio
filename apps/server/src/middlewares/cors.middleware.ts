import type { Context } from "hono";
import { cors } from "hono/cors";
import { PageDomainError } from "../exceptions/page-domain.exception";
import type { AppEnv } from "../types";

export function createApiCors({
	origin,
	resolveDomain,
}: {
	origin: string;
	resolveDomain: (
		hostname: string,
		c: Context<AppEnv>,
	) => Promise<{ handle: string } | null>;
}) {
	return cors({
		origin: async (requestOrigin, c) => {
			if (requestOrigin === origin) return requestOrigin;
			if (!requestOrigin) return null;

			const method =
				c.req.method === "OPTIONS"
					? c.req.header("Access-Control-Request-Method")
					: c.req.method;
			const match = /^\/pages\/([^/]+)\/views\/?$/.exec(c.req.path);
			if (method !== "GET" || !match?.[1]) return null;

			let url: URL;
			let handle: string;
			try {
				url = new URL(requestOrigin);
				if (
					url.protocol !== "https:" ||
					url.origin !== requestOrigin ||
					url.port
				)
					return null;
				handle = decodeURIComponent(match[1]);
			} catch {
				return null;
			}

			c.header("Cache-Control", "no-store");
			try {
				const page = await resolveDomain(url.hostname, c);
				return page?.handle === handle ? requestOrigin : null;
			} catch (error) {
				if (error instanceof PageDomainError && error.code === "DOMAIN_INVALID")
					return null;
				throw error;
			}
		},
		allowMethods: (requestOrigin) =>
			requestOrigin === origin
				? ["GET", "POST", "PATCH", "DELETE", "OPTIONS"]
				: ["GET", "OPTIONS"],
		allowHeaders: ["Content-Type", "Authorization", "baggage", "sentry-trace"],
		credentials: true,
	});
}
