import type { AppEnv } from "@core/app-factory";
import {
	createItemMediaKey,
	createItemMediaUploadUrl,
	getItemMediaUrl,
	isItemMediaKey,
	MAX_ITEM_MEDIA_SIZE,
	validateItemMediaUpload,
} from "@core/r2";
import {
	type PageItemUploadRequest,
	pageItemUploadCompleteResponseSchema,
	pageItemUploadRequestSchema,
	pageItemUploadResponseSchema,
} from "@grabbin/api";
import * as v from "valibot";
import { UnprocessableEntityError } from "../exceptions/http-exceptions";

export const getPublicItemMediaUrl = (
	publicBaseUrl: string | undefined,
	objectKey: string,
) =>
	getItemMediaUrl(
		publicBaseUrl,
		objectKey,
	);

export const createItemMediaUpload =
	async ({
		env,
		userId,
		pageId,
		input,
	}: {
		env: AppEnv["Bindings"];
		userId: string;
		pageId: string;
		input: PageItemUploadRequest;
	}) => {
		const parsed = v.safeParse(
			pageItemUploadRequestSchema,
			input,
		);
		if (
			!parsed.success ||
			parsed.output.size >
				MAX_ITEM_MEDIA_SIZE ||
			!validateItemMediaUpload(
				parsed.output,
			)
		)
			throw new UnprocessableEntityError(
				"Invalid item media.",
				"INVALID_ITEM_MEDIA",
			);

		const objectKey =
			createItemMediaKey({
				...parsed.output,
				userId,
				pageId,
			});
		if (!objectKey)
			throw new UnprocessableEntityError(
				"Invalid media filename.",
				"INVALID_ITEM_MEDIA",
			);

		return v.parse(
			pageItemUploadResponseSchema,
			await createItemMediaUploadUrl({
				accountId: env.R2_ACCOUNT_ID,
				accessKeyId:
					env.R2_ACCESS_KEY_ID,
				secretAccessKey:
					env.R2_SECRET_ACCESS_KEY,
				objectKey,
				contentType:
					parsed.output.contentType,
			}),
		);
	};

export const completeItemMediaUpload =
	async ({
		env,
		userId,
		pageId,
		objectKey,
	}: {
		env: AppEnv["Bindings"];
		userId: string;
		pageId: string;
		objectKey: string;
	}) => {
		if (
			!isItemMediaKey(objectKey) ||
			!objectKey.startsWith(
				`users/${userId}/${pageId}/`,
			)
		)
			throw new UnprocessableEntityError(
				"Invalid item media key.",
				"INVALID_ITEM_MEDIA",
			);

		const uploadedObject =
			await env.IMAGES.head(objectKey);
		const contentType =
			uploadedObject?.httpMetadata
				?.contentType ?? "";
		if (
			!uploadedObject ||
			uploadedObject.size >
				MAX_ITEM_MEDIA_SIZE ||
			!/^(image|video)\//i.test(
				contentType,
			)
		)
			throw new UnprocessableEntityError(
				"Uploaded item media was not found.",
				"ITEM_MEDIA_NOT_FOUND",
			);

		return v.parse(
			pageItemUploadCompleteResponseSchema,
			{
				objectKey,
				mimeType: contentType,
				size: uploadedObject.size,
			},
		);
	};
