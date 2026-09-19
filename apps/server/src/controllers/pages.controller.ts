import {
	createPageSchema,
	pageImageKeySchema,
	pageImageUploadSchema,
	pageProfileSchema,
	updatePageDraftSchema,
} from "@grabbin/api";
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
import {
	createPageImageKey,
	createPresignedPutUrl,
	isOwnedPageImageKey,
} from "../services/media.service";
import {
	completePage,
	createPage,
	getPage,
	updatePageDraft,
} from "../services/page.service";
import { checkPageHandle } from "../services/page-handle.service";
import type { AppEnv } from "../types";

const pageErrorDetails = {
	HANDLE_INVALID: "Choose a valid handle.",
	HANDLE_RESERVED: "That handle is reserved.",
	HANDLE_TAKEN: "That handle is already taken.",
	PAGE_ALREADY_EXISTS: "You already have a page.",
	PAGE_NOT_FOUND: "Page not found.",
	PAGE_IMAGE_INVALID: "The uploaded image is invalid.",
	UNIQUE_CONFLICT: "That handle is already taken.",
} as const;

function pageErrorResponse(c: Context, error: PageServiceError) {
	const status =
		error.code === "HANDLE_INVALID"
			? 422
			: error.code === "PAGE_IMAGE_INVALID"
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

		const { id: _id, userId, ...publicPage } = page;
		const canEdit = c.var.session?.user.id === userId;
		const hasCookie = Boolean(c.req.header("cookie"));
		c.header(
			"Cache-Control",
			hasCookie ? "private, no-store" : "public, max-age=60, s-maxage=60",
		);
		if (hasCookie) c.header("Vary", "Cookie");
		return c.json({
			page: {
				...publicPage,
				isOwner: canEdit,
				canEdit,
			},
		});
	})
	.post("/:handle/profile-image/upload-url", requiredSession, async (c) => {
		const session = c.var.session;
		if (!session) {
			return jsonApiError(c, {
				status: 401,
				detail: "Authentication required.",
			});
		}

		const parsed = v.safeParse(
			pageImageUploadSchema,
			await c.req.json().catch(() => null),
		);
		if (!parsed.success) {
			return jsonApiError(c, {
				status: 422,
				detail: "Choose a supported image smaller than 5 MB.",
			});
		}

		const page = await getPage(c.var.db, c.req.param("handle"));
		if (!page || page.userId !== session.user.id) {
			return jsonApiError(c, { status: 404, detail: "Page not found." });
		}

		const key = createPageImageKey({
			userId: session.user.id,
			pageId: page.id,
			contentType: parsed.output.contentType,
		});
		const upload = await createPresignedPutUrl({
			accountId: c.env.R2_ACCOUNT_ID,
			bucketName: c.env.R2_BUCKET_NAME,
			accessKeyId: c.env.R2_ACCESS_KEY_ID,
			secretAccessKey: c.env.R2_SECRET_ACCESS_KEY,
			key,
			contentType: parsed.output.contentType,
		});

		return c.json({
			key,
			uploadUrl: upload.url,
			expiresAt: upload.expiresAt,
		});
	})
	.delete("/:handle/profile-image", requiredSession, async (c) => {
		const session = c.var.session;
		if (!session) {
			return jsonApiError(c, {
				status: 401,
				detail: "Authentication required.",
			});
		}
		const parsed = v.safeParse(
			pageImageKeySchema,
			await c.req.json().catch(() => null),
		);
		if (!parsed.success) {
			return jsonApiError(c, {
				status: 422,
				detail: "The image key is invalid.",
			});
		}

		const page = await getPage(c.var.db, c.req.param("handle"));
		if (!page || page.userId !== session.user.id) {
			return jsonApiError(c, { status: 404, detail: "Page not found." });
		}
		if (
			!isOwnedPageImageKey({
				key: parsed.output.key,
				userId: session.user.id,
				pageId: page.id,
			})
		) {
			return jsonApiError(c, {
				status: 422,
				detail: "The image key is invalid.",
			});
		}

		await c.env.R2_BUCKET.delete(parsed.output.key);
		return c.body(null, 204);
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
			updatePageDraftSchema,
			await c.req.json().catch(() => null),
		);
		if (!parsed.success) {
			return jsonApiError(c, {
				status: 422,
				detail: "Enter a valid name.",
			});
		}

		try {
			const page = await updatePageDraft({
				db: c.var.db,
				bucket: c.env.R2_BUCKET,
				userId: session.user.id,
				handle: c.req.param("handle"),
				draft: parsed.output,
			});
			return c.json({ page });
		} catch (error) {
			if (error instanceof PageServiceError) return pageErrorResponse(c, error);
			throw error;
		}
	})
	.post("/:handle", requiredSession, async (c) => {
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
				bucket: c.env.R2_BUCKET,
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
