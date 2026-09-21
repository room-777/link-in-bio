import type { PageItemBatchRequest, PageItemBatchResponse } from "@grabbin/api";
import {
	pageItemBatchRequestSchema,
	pageItemUploadCompleteRequestSchema,
	pageItemUploadRequestSchema,
} from "@grabbin/api";
import type { DatabaseClient } from "@grabbin/db";
import type { MiddlewareHandler } from "hono";
import { Hono } from "hono";
import * as v from "valibot";

import { jsonApiError } from "../api-error";
import { PageItemServiceError } from "../exceptions/page-item.exception";
import {
	completeItemMediaUpload,
	createItemMediaUpload,
} from "../services/media.service";
import { getPage } from "../services/page.service";
import type { AppEnv } from "../types";

const pageItemErrorDetails = {
	PAGE_NOT_FOUND: "Page not found.",
	DUPLICATE_ITEM_ID: "Item IDs must be unique.",
	CONFLICTING_ITEM_OPERATION:
		"An item cannot be deleted and updated in the same batch.",
	ITEM_ID_ALREADY_CLAIMED: "That item belongs to another page.",
	ITEM_TYPE_IMMUTABLE: "An item cannot change type.",
	ITEM_NOT_FOUND: "The item to delete was not found.",
	INVALID_ITEM_LAYOUT: "Items may not overlap or exceed the grid.",
	INVALID_MEDIA_KEY: "The media object key is invalid.",
	INVALID_MEDIA_UPLOAD: "Invalid item media.",
	ITEM_MEDIA_NOT_FOUND: "Uploaded item media was not found.",
	CONCURRENT_ITEM_UPDATE: "The item changed before this update was saved.",
} as const;

function pageItemErrorResponse(
	c: Parameters<typeof jsonApiError>[0],
	error: PageItemServiceError,
) {
	const status =
		error.code === "PAGE_NOT_FOUND" || error.code === "ITEM_NOT_FOUND"
			? 404
			: error.code === "CONCURRENT_ITEM_UPDATE"
				? 409
				: 422;
	return jsonApiError(c, {
		status,
		code: error.code,
		detail: pageItemErrorDetails[error.code],
	});
}

type PersistPageItemBatch = (input: {
	db: DatabaseClient;
	handle: string;
	userId: string;
	batch: PageItemBatchRequest;
	publicBaseUrl?: string;
}) => Promise<PageItemBatchResponse>;

export type PageItemsControllerOptions = {
	sessionMiddleware: MiddlewareHandler<AppEnv>;
	persist: PersistPageItemBatch;
};

export function createPageItemsController({
	sessionMiddleware,
	persist,
}: PageItemsControllerOptions) {
	return new Hono<AppEnv>()
		.post("/:handle/items/upload", sessionMiddleware, async (c) => {
			const session = c.var.session;
			if (!session) {
				return jsonApiError(c, {
					status: 401,
					detail: "Authentication required.",
				});
			}

			const parsed = v.safeParse(
				pageItemUploadRequestSchema,
				await c.req.json().catch(() => null),
			);
			if (!parsed.success) {
				return jsonApiError(c, {
					status: 422,
					code: "INVALID_MEDIA_UPLOAD",
					detail: pageItemErrorDetails.INVALID_MEDIA_UPLOAD,
				});
			}

			const page = await getPage(c.var.db, c.req.param("handle"));
			if (!page || page.userId !== session.user.id) {
				return jsonApiError(c, { status: 404, detail: "Page not found." });
			}

			try {
				return c.json(
					await createItemMediaUpload({
						accountId: c.env.R2_ACCOUNT_ID,
						bucketName: c.env.R2_BUCKET_NAME,
						accessKeyId: c.env.R2_ACCESS_KEY_ID,
						secretAccessKey: c.env.R2_SECRET_ACCESS_KEY,
						userId: session.user.id,
						pageId: page.id,
						request: parsed.output,
					}),
				);
			} catch (error) {
				if (error instanceof PageItemServiceError) {
					return pageItemErrorResponse(c, error);
				}
				throw error;
			}
		})
		.post("/:handle/items/upload/complete", sessionMiddleware, async (c) => {
			const session = c.var.session;
			if (!session) {
				return jsonApiError(c, {
					status: 401,
					detail: "Authentication required.",
				});
			}

			const parsed = v.safeParse(
				pageItemUploadCompleteRequestSchema,
				await c.req.json().catch(() => null),
			);
			if (!parsed.success) {
				return jsonApiError(c, {
					status: 422,
					code: "INVALID_MEDIA_KEY",
					detail: pageItemErrorDetails.INVALID_MEDIA_KEY,
				});
			}

			const page = await getPage(c.var.db, c.req.param("handle"));
			if (!page || page.userId !== session.user.id) {
				return jsonApiError(c, { status: 404, detail: "Page not found." });
			}

			try {
				return c.json(
					await completeItemMediaUpload({
						bucket: c.env.R2_BUCKET,
						userId: session.user.id,
						pageId: page.id,
						objectKey: parsed.output.objectKey,
					}),
				);
			} catch (error) {
				if (error instanceof PageItemServiceError) {
					return pageItemErrorResponse(c, error);
				}
				throw error;
			}
		})
		.patch("/:handle/batch", sessionMiddleware, async (c) => {
			const session = c.var.session;
			if (!session) {
				return jsonApiError(c, {
					status: 401,
					detail: "Authentication required.",
				});
			}

			const parsed = v.safeParse(
				pageItemBatchRequestSchema,
				await c.req.json().catch(() => null),
			);
			if (!parsed.success) {
				return jsonApiError(c, {
					status: 422,
					code: "INVALID_ITEM_BATCH",
					detail: "Invalid item batch.",
				});
			}

			try {
				return c.json(
					await persist({
						db: c.var.db,
						handle: c.req.param("handle"),
						userId: session.user.id,
						batch: parsed.output,
						publicBaseUrl: c.env?.R2_PUBLIC_URL,
					}),
				);
			} catch (error) {
				if (error instanceof PageItemServiceError) {
					return pageItemErrorResponse(c, error);
				}
				throw error;
			}
		});
}
