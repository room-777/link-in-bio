import type { AppEnv } from "@core/app-factory";
import {
	pageItemBatchRequestSchema,
	pageItemMetadataRequestSchema,
	pageItemUploadCompleteRequestSchema,
	pageItemUploadRequestSchema,
} from "@grabbin/api";
import { Hono } from "hono";
import { jsonBody } from "../middlewares/json-body.middleware";
import {
	requireAuthenticatedUser,
	requireWritableOwnedPage,
} from "../middlewares/page-access.middleware";
import {
	completeItemMediaUpload,
	createItemMediaUpload,
} from "../services/item-media.service";
import { enrichPageItemMetadata } from "../services/link-metadata.service";
import {
	mapPageItemResponse,
	persistPageItemBatch,
} from "../services/page-item.service";

export const pageItemsController =
	new Hono<AppEnv>()
		.use(
			"/:handle/metadata",
			requireWritableOwnedPage,
		)
		.use(
			"/:handle/items/upload",
			requireWritableOwnedPage,
		)
		.use(
			"/:handle/items/upload/complete",
			requireWritableOwnedPage,
		)
		.use(
			"/:handle/batch",
			requireAuthenticatedUser,
		)
		.post(
			"/:handle/metadata",
			jsonBody(
				pageItemMetadataRequestSchema,
				"Invalid link metadata request.",
				"INVALID_LINK_METADATA_REQUEST",
			),
			async (c) => {
				const user = c.get(
					"authenticatedUser",
				);
				const parsed =
					c.req.valid("json");
				const item =
					await enrichPageItemMetadata({
						db: c.get("db"),
						handle:
							c.req.param("handle"),
						userId: user.id,
						itemId: parsed.itemId,
						url: parsed.url,
						publicBaseUrl:
							c.env?.R2_PUBLIC_URL,
						env: c.env,
						fetch: (input, init) =>
							fetch(input, init),
					});
				return c.json({
					item: mapPageItemResponse(
						item,
						c.env?.R2_PUBLIC_URL,
					),
				});
			},
		)
		.post(
			"/:handle/items/upload",
			jsonBody(
				pageItemUploadRequestSchema,
				"Invalid item media.",
				"INVALID_ITEM_MEDIA",
			),
			async (c) => {
				const user = c.get(
					"authenticatedUser",
				);
				const page = c.get("ownedPage");
				const parsed =
					c.req.valid("json");
				return c.json(
					await createItemMediaUpload({
						env: c.env,
						userId: user.id,
						pageId: page.id,
						input: parsed,
					}),
				);
			},
		)
		.post(
			"/:handle/items/upload/complete",
			jsonBody(
				pageItemUploadCompleteRequestSchema,
				"Invalid item media key.",
				"INVALID_ITEM_MEDIA",
			),
			async (c) => {
				const user = c.get(
					"authenticatedUser",
				);
				const page = c.get("ownedPage");
				const parsed =
					c.req.valid("json");
				return c.json(
					await completeItemMediaUpload(
						{
							env: c.env,
							userId: user.id,
							pageId: page.id,
							objectKey:
								parsed.objectKey,
						},
					),
				);
			},
		)
		.patch(
			"/:handle/batch",
			jsonBody(
				pageItemBatchRequestSchema,
				"Invalid item batch.",
				"INVALID_ITEM_BATCH",
			),
			async (c) => {
				const user = c.get(
					"authenticatedUser",
				);
				const parsed =
					c.req.valid("json");
				return c.json(
					await persistPageItemBatch({
						db: c.get("db"),
						handle:
							c.req.param("handle"),
						userId: user.id,
						batch: parsed,
						queue:
							c.env
								?.ITEM_MEDIA_DELETE_QUEUE,
						executionCtx: c.env
							?.ITEM_MEDIA_DELETE_QUEUE
							? c.executionCtx
							: undefined,
						publicBaseUrl:
							c.env?.R2_PUBLIC_URL,
					}),
				);
			},
		);
