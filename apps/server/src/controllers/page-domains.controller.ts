import { connectPageDomainSchema } from "@grabbin/api";
import { type Context, Hono, type MiddlewareHandler } from "hono";
import { bodyLimit } from "hono/body-limit";
import * as v from "valibot";
import { jsonApiError } from "../api-error";
import { PageDomainError } from "../exceptions/page-domain.exception";
import type { PageDomainService } from "../services/page-domain.service";
import type { AppEnv } from "../types";

const errors = {
	DOMAIN_INVALID: [422, "Enter a public subdomain outside Grabbin."],
	DOMAIN_TAKEN: [409, "This domain is already assigned to a page."],
	PAGE_DOMAIN_EXISTS: [
		409,
		"Disconnect the current domain before connecting another.",
	],
	DOMAIN_NOT_FOUND: [404, "No domain is connected to this page."],
	PAGE_NOT_FOUND: [404, "Page not found."],
	PRO_REQUIRED: [403, "A Pro plan is required to connect a domain."],
	DOMAIN_NOT_CONFIGURED: [503, "Domain connections are not configured yet."],
	DOMAIN_PROVIDER_UNAVAILABLE: [
		503,
		"Domain connections are temporarily unavailable.",
	],
} as const;

function ownerId(c: Context<AppEnv>) {
	const session = c.var.session;
	if (!session) throw new Error("Authentication required.");
	return session.user.id;
}

/** HTTP-only adapter; authentication and service wiring are supplied by the server. */
export function createPageDomainsController({
	sessionMiddleware,
	service,
}: {
	sessionMiddleware: MiddlewareHandler<AppEnv>;
	service: (c: Context<AppEnv>) => PageDomainService;
}) {
	const controller = new Hono<AppEnv>();
	controller.use("/:handle/domain", async (c, next) => {
		c.header("Cache-Control", "no-store");
		await next();
	});
	controller.use("/:handle/domain/*", async (c, next) => {
		c.header("Cache-Control", "no-store");
		await next();
	});
	controller.use("/:handle/domain", sessionMiddleware);
	controller.use("/:handle/domain/*", sessionMiddleware);
	const authenticated: MiddlewareHandler<AppEnv> = async (c, next) => {
		if (!c.var.session)
			return jsonApiError(c, {
				status: 401,
				detail: "Authentication required.",
			});
		await next();
	};
	controller.use("/:handle/domain", authenticated);
	controller.use("/:handle/domain/*", authenticated);
	controller.onError((error, c) => {
		if (!(error instanceof PageDomainError)) {
			console.error("Domain request failed.");
			return jsonApiError(c, { status: 500 });
		}
		const [status, detail] = errors[error.code];
		return jsonApiError(c, { status, code: error.code, detail });
	});
	return controller
		.get("/domain/:hostname", async (c) => {
			c.header("Cache-Control", "no-store");
			const page = await service(c).resolve(c.req.param("hostname"));
			if (!page)
				return jsonApiError(c, { status: 404, detail: "Page not found." });
			return c.json({ handle: page.handle });
		})
		.get("/:handle/domain", async (c) =>
			c.json(await service(c).get(ownerId(c), c.req.param("handle"))),
		)
		.post(
			"/:handle/domain",
			bodyLimit({
				maxSize: 1024,
				onError: (c) =>
					jsonApiError(c, {
						status: 413,
						detail: "Request body is too large.",
					}),
			}),
			async (c) => {
				const parsed = v.safeParse(
					connectPageDomainSchema,
					await c.req.json().catch(() => null),
				);
				if (!parsed.success)
					return jsonApiError(c, {
						status: 422,
						code: "DOMAIN_INVALID",
						detail: "Enter a valid hostname.",
					});
				return c.json(
					await service(c).connect(
						ownerId(c),
						c.req.param("handle"),
						parsed.output.hostname,
					),
				);
			},
		)
		.post("/:handle/domain/check", async (c) =>
			c.json(await service(c).check(ownerId(c), c.req.param("handle"))),
		)
		.delete("/:handle/domain", async (c) => {
			const result = await service(c).disconnect(
				ownerId(c),
				c.req.param("handle"),
			);
			return c.json(result, result.domain ? 202 : 200);
		});
}
