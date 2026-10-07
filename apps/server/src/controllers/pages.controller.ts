import {
	createPageSchema,
	pageByHandleResponseSchema,
	pageImageKeySchema,
	pageImageUploadSchema,
	pageProfileSchema,
	updatePageDraftSchema,
} from "@grabbin/api";
import {
	cancelPendingPageMedia,
	registerPendingPageMedia,
} from "@grabbin/application/media-assets";
import {
	assertPageWritable,
	changePrimaryPage,
	deleteOwnedPage,
	listOwnedPages,
	listSitemapHandles,
	PageServiceError,
} from "@grabbin/application/page-lifecycle";
import { createDb } from "@grabbin/db";
import type { Context } from "hono";
import { Hono } from "hono";
import * as v from "valibot";
import { jsonApiError } from "../api-error";
import {
	optionalSession,
	requiredSession,
} from "../middlewares/session.middleware";
import {
	createPageImageKey,
	createPresignedPutUrl,
	isOwnedPageMediaKey,
} from "../services/media.service";
import {
	completePage,
	createPage,
	getPage,
	getPublicPageWithPlan,
	updatePageDraft,
	updatePageHandle,
} from "../services/page.service";
import { checkPageHandle } from "../services/page-handle.service";
import { listPageItems } from "../services/page-item.service";
import { getPublicViews } from "../services/public-views.service";
import type { AppEnv } from "../types";
import { createSitemapController } from "./sitemap.controller";

const pageErrorDetails = {
	HANDLE_INVALID: "Choose a valid handle.",
	HANDLE_RESERVED: "That handle is reserved.",
	HANDLE_TAKEN: "That handle is already taken.",
	PAGE_ALREADY_EXISTS: "You already have a page.",
	PAGE_LIMIT_REACHED: "Upgrade to Pro to create more pages.",
	PRO_REQUIRED: "A Pro plan is required for this action.",
	PAGE_READ_ONLY: "This page is read-only.",
	PRIMARY_PAGE_CANNOT_DELETE:
		"Choose another primary page before deleting this page.",
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
					: error.code === "PRO_REQUIRED" || error.code === "PAGE_READ_ONLY"
						? 403
						: 409;
	return jsonApiError(c, {
		status,
		code: error.code,
		detail: pageErrorDetails[error.code],
	});
}

function proProductIds(c: Context<AppEnv>) {
	return [
		c.env.CREEM_PRO_MONTHLY_PRODUCT_ID,
		c.env.CREEM_PRO_YEARLY_PRODUCT_ID,
	].filter(Boolean);
}

async function pageWriteError(
	c: Context<AppEnv>,
	userId: string,
	page: { id: string; handle?: string },
) {
	try {
		await assertPageWritable({
			db: c.var.db,
			userId,
			page,
			proProductIds: proProductIds(c),
		});
		return null;
	} catch (error) {
		if (error instanceof PageServiceError) return pageErrorResponse(c, error);
		throw error;
	}
}

export const pagesController = new Hono<AppEnv>()
	.route(
		"/sitemap",
		createSitemapController(async () => listSitemapHandles(await createDb())),
	)
	.get("/owned", requiredSession, async (c) => {
		const session = c.var.session;
		if (!session) {
			return jsonApiError(c, {
				status: 401,
				detail: "Authentication required.",
			});
		}
		c.header("Cache-Control", "private, no-store");
		return c.json(
			await listOwnedPages({
				db: c.var.db,
				userId: session.user.id,
				proProductIds: proProductIds(c),
			}),
		);
	})
	.get("/check", async (c) => {
		return c.json(
			await checkPageHandle({
				db: await createDb(),
				rawHandle: c.req.query("handle") ?? "",
			}),
		);
	})
	.get("/:handle/views", async (c) => {
		const page = await getPage(await createDb(), c.req.param("handle"));
		if (!page) {
			return jsonApiError(c, { status: 404, detail: "Page not found." });
		}

		const timezone = c.req.query("timezone") ?? "UTC";
		if (timezone.length > 100) {
			return jsonApiError(c, { status: 400, detail: "Invalid timezone." });
		}
		c.header("Cache-Control", "private, no-store");
		return c.json(await getPublicViews(page.id, timezone));
	})
	.get("/:handle", optionalSession, async (c) => {
		const page = await getPublicPageWithPlan(
			c.var.db,
			c.req.param("handle"),
			proProductIds(c),
		);
		if (!page) {
			return jsonApiError(c, { status: 404, detail: "Page not found." });
		}

		const { userId, ...publicPage } = page;
		const isOwner = c.var.session?.user.id === userId;
		const canEdit = isOwner
			? !(await pageWriteError(c, c.var.session?.user.id ?? "", page))
			: false;
		const hasCookie = Boolean(c.req.header("cookie"));
		c.header(
			"Cache-Control",
			hasCookie ? "private, no-store" : "public, max-age=0, must-revalidate",
		);
		if (hasCookie) c.header("Vary", "Cookie");
		const items = await listPageItems({
			db: c.var.db,
			pageId: page.id,
			publicBaseUrl: c.env.R2_PUBLIC_URL,
		});
		return c.json(
			v.parse(pageByHandleResponseSchema, {
				page: {
					...publicPage,
					isOwner: canEdit,
					canEdit,
					hasProAccess: page.hasProAccess,
				},
				items,
			}),
		);
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
		const writeError = await pageWriteError(c, session.user.id, page);
		if (writeError) return writeError;

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
		await registerPendingPageMedia({
			db: c.var.db,
			objectKey: key,
			pageId: page.id,
			userId: session.user.id,
			uploadExpiresAt: new Date(upload.expiresAt),
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
		const writeError = await pageWriteError(c, session.user.id, page);
		if (writeError) return writeError;
		if (
			!isOwnedPageMediaKey({
				key: parsed.output.key,
				userId: session.user.id,
				pageId: page.id,
				scope: "profile",
			})
		) {
			return jsonApiError(c, {
				status: 422,
				detail: "The image key is invalid.",
			});
		}

		await cancelPendingPageMedia({
			db: c.var.db,
			objectKey: parsed.output.key,
			pageId: page.id,
			userId: session.user.id,
		});
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
				proProductIds: proProductIds(c),
			});
			return c.json({ page }, 201);
		} catch (error) {
			if (error instanceof PageServiceError) return pageErrorResponse(c, error);
			throw error;
		}
	})
	.patch("/:handle/primary", requiredSession, async (c) => {
		const session = c.var.session;
		if (!session) {
			return jsonApiError(c, {
				status: 401,
				detail: "Authentication required.",
			});
		}
		try {
			const page = await changePrimaryPage({
				db: c.var.db,
				userId: session.user.id,
				handle: c.req.param("handle"),
				proProductIds: proProductIds(c),
			});
			return c.json({ page });
		} catch (error) {
			if (error instanceof PageServiceError) return pageErrorResponse(c, error);
			throw error;
		}
	})
	.delete("/:handle", requiredSession, async (c) => {
		const session = c.var.session;
		if (!session) {
			return jsonApiError(c, {
				status: 401,
				detail: "Authentication required.",
			});
		}
		try {
			await deleteOwnedPage({
				db: c.var.db,
				userId: session.user.id,
				handle: c.req.param("handle"),
			});
			return c.body(null, 204);
		} catch (error) {
			if (error instanceof PageServiceError) return pageErrorResponse(c, error);
			throw error;
		}
	})
	.patch("/:handle/handle", requiredSession, async (c) => {
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
			return jsonApiError(c, {
				status: 422,
				detail: "Choose a valid handle.",
			});
		}

		try {
			const page = await updatePageHandle({
				db: c.var.db,
				userId: session.user.id,
				handle: c.req.param("handle"),
				rawHandle: parsed.output.handle,
				proProductIds: proProductIds(c),
			});
			return c.json({ page });
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
				detail: "Enter valid profile details.",
			});
		}

		try {
			const page = await updatePageDraft({
				db: c.var.db,
				bucket: c.env.R2_BUCKET,
				userId: session.user.id,
				handle: c.req.param("handle"),
				draft: parsed.output,
				proProductIds: proProductIds(c),
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
				proProductIds: proProductIds(c),
			});
			return c.json({ page });
		} catch (error) {
			if (error instanceof PageServiceError) return pageErrorResponse(c, error);
			throw error;
		}
	});
