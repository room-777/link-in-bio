import type { PageItemBatchRequest, PageItemBatchResponse } from "@grabbin/api";
import { pageItemBatchRequestSchema } from "@grabbin/api";
import type { DatabaseClient } from "@grabbin/db";
import type { MiddlewareHandler } from "hono";
import { Hono } from "hono";
import * as v from "valibot";

import { jsonApiError } from "../api-error";
import { PageItemServiceError } from "../exceptions/page-item.exception";
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
	return new Hono<AppEnv>().patch(
		"/:handle/batch",
		sessionMiddleware,
		async (c) => {
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
		},
	);
}
