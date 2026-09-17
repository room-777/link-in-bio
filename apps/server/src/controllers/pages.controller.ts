import { createPageSchema, pageProfileSchema } from "@grabbin/api";
import { createDb } from "@grabbin/db";
import type { Context } from "hono";
import { Hono } from "hono";
import * as v from "valibot";

import { jsonApiError } from "../api-error";
import { PageServiceError } from "../exceptions/page.exception";
import {
	optionalSession,
	requiredSession,
} from "../middlewares/session.middleware";
import { completePage, createPage, getPage } from "../services/page.service";
import { checkPageHandle } from "../services/page-handle.service";
import type { AppEnv } from "../types";

const pageErrorDetails = {
	HANDLE_INVALID: "Choose a valid handle.",
	HANDLE_RESERVED: "That handle is reserved.",
	HANDLE_TAKEN: "That handle is already taken.",
	PAGE_ALREADY_EXISTS: "You already have a page.",
	PAGE_NOT_FOUND: "Page not found.",
	UNIQUE_CONFLICT: "That handle is already taken.",
} as const;

function pageErrorResponse(c: Context, error: PageServiceError) {
	const status =
		error.code === "HANDLE_INVALID"
			? 422
			: error.code === "PAGE_NOT_FOUND"
				? 404
				: 409;
	return jsonApiError(c, {
		status,
		code: error.code,
		detail: pageErrorDetails[error.code],
	});
}

export const pagesController = new Hono<AppEnv>()
	.get("/check", async (c) => {
		return c.json(
			await checkPageHandle({
				db: await createDb(),
				rawHandle: c.req.query("handle") ?? "",
			}),
		);
	})
	.get("/:handle", optionalSession, async (c) => {
		const page = await getPage(c.var.db, c.req.param("handle"));
		if (!page) {
			return jsonApiError(c, { status: 404, detail: "Page not found." });
		}

		const { userId, ...publicPage } = page;
		return c.json({
			page: {
				...publicPage,
				isOwner: c.var.session?.user.id === userId,
			},
		});
	})
	.post("/", requiredSession, async (c) => {
		const session = c.var.session;
		if (!session) {
			return jsonApiError(c, {
				status: 401,
				detail: "Authentication required.",
			});
		}
		const parsed = v.safeParse(
			createPageSchema,
			await c.req.json().catch(() => null),
		);
		if (!parsed.success) {
			return jsonApiError(c, { status: 400, detail: "A handle is required." });
		}

		try {
			const page = await createPage({
				db: c.var.db,
				userId: session.user.id,
				rawHandle: parsed.output.handle,
			});
			return c.json({ page }, 201);
		} catch (error) {
			if (error instanceof PageServiceError) return pageErrorResponse(c, error);
			throw error;
		}
	})
	.patch("/:handle", requiredSession, async (c) => {
		const session = c.var.session;
		if (!session) {
			return jsonApiError(c, {
				status: 401,
				detail: "Authentication required.",
			});
		}
		const parsed = v.safeParse(
			pageProfileSchema,
			await c.req.json().catch(() => null),
		);
		if (!parsed.success) {
			return jsonApiError(c, {
				status: 422,
				detail: "Enter a valid name.",
			});
		}

		try {
			const page = await completePage({
				db: c.var.db,
				userId: session.user.id,
				handle: c.req.param("handle"),
				profile: parsed.output,
			});
			return c.json({ page });
		} catch (error) {
			if (error instanceof PageServiceError) return pageErrorResponse(c, error);
			throw error;
		}
	});
