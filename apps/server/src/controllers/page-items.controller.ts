import type {
	PageItemBatchRequest,
	PageItemBatchResponse,
	PageItemMetadataRequest,
	PageItemResponse,
	RssFeedResponse,
} from "@grabbin/api";
import {
	pageItemBatchRequestSchema,
	pageItemMetadataRequestSchema,
	pageItemUploadCancelRequestSchema,
	pageItemUploadCompleteRequestSchema,
	pageItemUploadRequestSchema,
} from "@grabbin/api";
import { registerPendingPageMedia } from "@grabbin/application/media-assets";
import {
	assertPageWritable,
	PageServiceError,
} from "@grabbin/application/page-lifecycle";
import type { DatabaseClient } from "@grabbin/db";
import type { Context, MiddlewareHandler } from "hono";
import { Hono } from "hono";
import * as v from "valibot";
import { jsonApiError } from "../api-error";
import { PageItemServiceError } from "../exceptions/page-item.exception";
import { optionalSession } from "../middlewares/session.middleware";
import type { LinkProviderEnvironment } from "../services/link-providers";
import {
	cancelItemMediaUpload,
	completeItemMediaUpload,
	createItemMediaUpload,
} from "../services/media.service";
import { getOwnedPage } from "../services/page.service";
import { getPageItemRssUrl } from "../services/page-item.service";
import { RssServiceError } from "../services/rss/rss.service";
import type { AppEnv } from "../types";

const pageItemErrorDetails = {
	PAGE_NOT_FOUND: "Page not found.",
	INVALID_ITEM_BATCH: "Invalid item batch.",
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
	INVALID_LINK_METADATA: "Invalid link metadata request.",
	UPSTREAM_RATE_LIMITED:
		"The linked site is temporarily rate limiting requests.",
	UNSUPPORTED_RSS_URL: "This address is not a supported RSS source.",
	RSS_FEED_UNAVAILABLE: "The RSS feed could not be loaded.",
	INVALID_RSS_FEED: "The RSS feed returned invalid data.",
	ITEM_NOT_LINK: "The item is not a link.",
	STALE_LINK_METADATA: "The link URL changed before metadata completed.",
} as const;

function pageItemErrorResponse(
	c: Parameters<typeof jsonApiError>[0],
	error: PageItemServiceError,
) {
	if (error.retryAfter) c.header("Retry-After", error.retryAfter);
	const status =
		error.code === "PAGE_NOT_FOUND" || error.code === "ITEM_NOT_FOUND"
			? 404
			: error.code === "UPSTREAM_RATE_LIMITED"
				? 429
				: error.code === "CONCURRENT_ITEM_UPDATE"
					? 409
					: error.code === "STALE_LINK_METADATA"
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

type EnrichPageItemMetadata = (input: {
	db: DatabaseClient;
	handle: string;
	userId: string;
	itemId: string;
	url: PageItemMetadataRequest["url"];
	publicBaseUrl?: string;
	fetch: typeof fetch;
	env?: LinkProviderEnvironment;
}) => Promise<PageItemResponse>;

async function readJson(c: Context<AppEnv>) {
	return c.req.json().catch(() => null);
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
			proProductIds: [
				c.env.CREEM_PRO_MONTHLY_PRODUCT_ID,
				c.env.CREEM_PRO_YEARLY_PRODUCT_ID,
			].filter(Boolean),
		});
		return null;
	} catch (error) {
		if (error instanceof PageServiceError) {
			return jsonApiError(c, {
				status: 403,
				code: "PAGE_READ_ONLY",
				detail: "This page is read-only.",
			});
		}
		throw error;
	}
}

async function rssFeedResponse(
	c: Context<AppEnv>,
	fetchRss: NonNullable<PageItemsControllerOptions["fetchRss"]>,
	url: string,
) {
	try {
		return c.json({
			rss: await fetchRss({
				url,
				fetch: (input, init) => fetch(input, init),
			}),
		});
	} catch (error) {
		if (!(error instanceof RssServiceError)) throw error;
		return jsonApiError(c, {
			status: error.code === "UNSUPPORTED_RSS_URL" ? 422 : 502,
			code: error.code,
			detail: pageItemErrorDetails[error.code],
		});
	}
}

export type PageItemsControllerOptions = {
	sessionMiddleware: MiddlewareHandler<AppEnv>;
	persist: PersistPageItemBatch;
	enrichMetadata: EnrichPageItemMetadata;
	fetchRss?: (input: {
		url: string;
		fetch: typeof fetch;
	}) => Promise<RssFeedResponse>;
};

export function createPageItemsController({
	sessionMiddleware,
	persist,
	enrichMetadata,
	fetchRss = async () => {
		throw new RssServiceError("RSS_FEED_UNAVAILABLE");
	},
}: PageItemsControllerOptions) {
	return new Hono<AppEnv>()
		.get("/:handle/items/:itemId/rss", optionalSession, async (c) => {
			const url = await getPageItemRssUrl({
				db: c.var.db,
				handle: c.req.param("handle"),
				itemId: c.req.param("itemId"),
			});
			if (!url) return jsonApiError(c, { status: 404, code: "NOT_FOUND" });

			return rssFeedResponse(c, fetchRss, url);
		})
		.post("/:handle/metadata", sessionMiddleware, async (c) => {
			const session = c.var.session;
			if (!session) {
				return jsonApiError(c, {
					status: 401,
					detail: "Authentication required.",
				});
			}

			const parsed = v.safeParse(
				pageItemMetadataRequestSchema,
				await readJson(c),
			);
			if (!parsed.success) {
				return jsonApiError(c, {
					status: 422,
					code: "INVALID_LINK_METADATA",
					detail: pageItemErrorDetails.INVALID_LINK_METADATA,
				});
			}
			const page = await getOwnedPage(c.var.db, {
				handle: c.req.param("handle"),
				userId: session.user.id,
			});
			if (!page)
				return jsonApiError(c, { status: 404, detail: "Page not found." });

			if ("kind" in parsed.output && parsed.output.kind === "rss") {
				return rssFeedResponse(c, fetchRss, parsed.output.url);
			}

			if (!("itemId" in parsed.output)) {
				return jsonApiError(c, {
					status: 422,
					code: "INVALID_LINK_METADATA",
					detail: pageItemErrorDetails.INVALID_LINK_METADATA,
				});
			}

			const writeError = await pageWriteError(c, session.user.id, page);
			if (writeError) return writeError;

			try {
				return c.json({
					item: await enrichMetadata({
						db: c.var.db,
						handle: c.req.param("handle"),
						userId: session.user.id,
						itemId: parsed.output.itemId,
						url: parsed.output.url,
						publicBaseUrl: c.env?.R2_PUBLIC_URL,
						fetch: (input, init) => fetch(input, init),
						env: c.env,
					}),
				});
			} catch (error) {
				if (error instanceof PageItemServiceError) {
					return pageItemErrorResponse(c, error);
				}
				throw error;
			}
		})
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
				await readJson(c),
			);
			if (!parsed.success) {
				return jsonApiError(c, {
					status: 422,
					code: "INVALID_MEDIA_UPLOAD",
					detail: pageItemErrorDetails.INVALID_MEDIA_UPLOAD,
				});
			}

			const page = await getOwnedPage(c.var.db, {
				handle: c.req.param("handle"),
				userId: session.user.id,
			});
			if (!page) {
				return jsonApiError(c, { status: 404, detail: "Page not found." });
			}
			const writeError = await pageWriteError(c, session.user.id, page);
			if (writeError) return writeError;

			try {
				const upload = await createItemMediaUpload({
					s3Credentials: c.env.R2_S3_CREDENTIALS,
					userId: session.user.id,
					pageId: page.id,
					request: parsed.output,
				});
				await registerPendingPageMedia({
					db: c.var.db,
					objectKey: upload.objectKey,
					pageId: page.id,
					userId: session.user.id,
					uploadExpiresAt: new Date(upload.expiresAt),
				});
				return c.json(upload);
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
				await readJson(c),
			);
			if (!parsed.success) {
				return jsonApiError(c, {
					status: 422,
					code: "INVALID_MEDIA_KEY",
					detail: pageItemErrorDetails.INVALID_MEDIA_KEY,
				});
			}

			const page = await getOwnedPage(c.var.db, {
				handle: c.req.param("handle"),
				userId: session.user.id,
			});
			if (!page) {
				return jsonApiError(c, { status: 404, detail: "Page not found." });
			}
			const writeError = await pageWriteError(c, session.user.id, page);
			if (writeError) return writeError;

			try {
				return c.json(
					await completeItemMediaUpload({
						bucket: c.env.R2_BUCKET,
						userId: session.user.id,
						pageId: page.id,
						objectKey: parsed.output.objectKey,
						itemId: parsed.output.itemId,
						kind: parsed.output.kind,
					}),
				);
			} catch (error) {
				if (error instanceof PageItemServiceError) {
					return pageItemErrorResponse(c, error);
				}
				throw error;
			}
		})
		.post("/:handle/items/upload/cancel", sessionMiddleware, async (c) => {
			const session = c.var.session;
			if (!session) {
				return jsonApiError(c, {
					status: 401,
					detail: "Authentication required.",
				});
			}

			const parsed = v.safeParse(
				pageItemUploadCancelRequestSchema,
				await readJson(c),
			);
			if (!parsed.success) {
				return jsonApiError(c, {
					status: 422,
					code: "INVALID_MEDIA_UPLOAD",
					detail: pageItemErrorDetails.INVALID_MEDIA_UPLOAD,
				});
			}

			const page = await getOwnedPage(c.var.db, {
				handle: c.req.param("handle"),
				userId: session.user.id,
			});
			if (!page) {
				return jsonApiError(c, { status: 404, detail: "Page not found." });
			}
			const writeError = await pageWriteError(c, session.user.id, page);
			if (writeError) return writeError;

			try {
				await cancelItemMediaUpload({
					db: c.var.db,
					userId: session.user.id,
					pageId: page.id,
					objectKey: parsed.output.objectKey,
					itemId: parsed.output.itemId,
					kind: parsed.output.kind,
				});
				return c.body(null, 204);
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

			const parsed = v.safeParse(pageItemBatchRequestSchema, await readJson(c));
			if (!parsed.success) {
				return jsonApiError(c, {
					status: 422,
					code: "INVALID_ITEM_BATCH",
					detail: "Invalid item batch.",
				});
			}
			const page = await getOwnedPage(c.var.db, {
				handle: c.req.param("handle"),
				userId: session.user.id,
			});
			if (!page)
				return jsonApiError(c, { status: 404, detail: "Page not found." });
			const writeError = await pageWriteError(c, session.user.id, page);
			if (writeError) return writeError;

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
