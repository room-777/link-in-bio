import type { AppEnv } from "@core/app-factory";
import {
	createProfileImageKey,
	createProfileImageUploadUrl,
	isLegacyProfileImageKey,
	isProfileImageKey,
	MAX_PROFILE_IMAGE_SIZE,
	validateProfileImageUpload,
} from "@core/r2";
import type { DatabaseClient } from "@db/index";
import { pages } from "@db/schema";
import type {
	ProfileImageCompleteRequest,
	ProfileImageState,
	ProfileImageUploadRequest,
} from "@grabbin/api";
import {
	and,
	eq,
	sql,
} from "drizzle-orm";
import {
	ConflictError,
	UnprocessableEntityError,
} from "../exceptions/http-exceptions";
import { assertOwnedPage } from "./page.service";
import { assertPageWritable } from "./page-lifecycle.service";

const profileImagePrefix = (
	userId: string,
	pageId: string,
) =>
	`users/${userId}/${pageId}/profile/`;

export const profileImageOperationWhere =
	({
		pageId,
		userId,
		expectedImage,
	}: {
		pageId: string;
		userId: string;
		expectedImage: ProfileImageState;
	}) =>
		and(
			eq(pages.id, pageId),
			eq(pages.userId, userId),
			sql`${pages.image} IS NOT DISTINCT FROM ${expectedImage.image}`,
			sql`${pages.imageSource} IS NOT DISTINCT FROM ${expectedImage.imageSource}`,
			sql`${pages.imageCrop} IS NOT DISTINCT FROM ${expectedImage.imageCrop}`,
		);

const deleteProfileObjects = async ({
	env,
	keys,
	protectedKeys = [],
}: {
	env: AppEnv["Bindings"];
	keys: Iterable<string>;
	protectedKeys?: Iterable<
		string | null | undefined
	>;
}) => {
	const protectedKeySet = new Set(
		[...protectedKeys].filter(
			(key): key is string =>
				Boolean(key),
		),
	);
	const deletableKeys = [
		...new Set(keys),
	].filter(
		(key) => !protectedKeySet.has(key),
	);
	const results =
		await Promise.allSettled(
			deletableKeys.map((key) =>
				env.IMAGES.delete(key),
			),
		);
	for (const result of results) {
		if (result.status === "rejected") {
			console.error(
				"[profile-image] R2 cleanup failed",
				result.reason,
			);
		}
	}
};

const createUploadSlot = async ({
	env,
	objectKey,
	contentType,
}: {
	env: AppEnv["Bindings"];
	objectKey: string;
	contentType: string;
}) => ({
	...(await createProfileImageUploadUrl(
		{
			accountId: env.R2_ACCOUNT_ID,
			accessKeyId: env.R2_ACCESS_KEY_ID,
			secretAccessKey:
				env.R2_SECRET_ACCESS_KEY,
			objectKey,
			contentType,
		},
	)),
	contentType,
	cacheControl: null,
});

export const createProfileImageUpload =
	async ({
		env,
		db,
		handle,
		userId,
		input,
	}: {
		env: AppEnv["Bindings"];
		db: DatabaseClient;
		handle: string;
		userId: string;
		input: ProfileImageUploadRequest;
	}) => {
		const page = await assertOwnedPage(
			db,
			handle,
			userId,
		);
		await assertPageWritable({
			db,
			userId,
			page,
		});
		if (
			input.size >
				MAX_PROFILE_IMAGE_SIZE ||
			!validateProfileImageUpload(input)
		) {
			throw new UnprocessableEntityError(
				"Invalid profile image.",
				"INVALID_PROFILE_IMAGE",
			);
		}

		const sourceObjectKey =
			createProfileImageKey(
				userId,
				page.id,
				input.contentType,
			);
		if (!sourceObjectKey) {
			throw new UnprocessableEntityError(
				"Unsupported profile image type.",
				"INVALID_PROFILE_IMAGE",
			);
		}

		return {
			source: await createUploadSlot({
				env,
				objectKey: sourceObjectKey,
				contentType: input.contentType,
			}),
			expectedImage: {
				image: page.image,
				imageSource:
					page.imageSource ?? null,
				imageCrop:
					page.imageCrop ?? null,
			},
		};
	};

export const completeProfileImageUpload =
	async ({
		env,
		db,
		handle,
		userId,
		input,
	}: {
		env: AppEnv["Bindings"];
		db: DatabaseClient;
		handle: string;
		userId: string;
		input: ProfileImageCompleteRequest;
	}) => {
		const page = await assertOwnedPage(
			db,
			handle,
			userId,
		);
		await assertPageWritable({
			db,
			userId,
			page,
		});
		const ownedPrefix =
			profileImagePrefix(
				userId,
				page.id,
			);
		if (
			!input.sourceObjectKey.startsWith(
				ownedPrefix,
			) ||
			!isProfileImageKey(
				input.sourceObjectKey,
			)
		) {
			throw new UnprocessableEntityError(
				"Invalid profile image key.",
				"INVALID_PROFILE_IMAGE",
			);
		}

		const sourceObject =
			await env.IMAGES.head(
				input.sourceObjectKey,
			);
		if (
			!sourceObject ||
			sourceObject.size >
				MAX_PROFILE_IMAGE_SIZE ||
			!sourceObject.httpMetadata?.contentType?.startsWith(
				"image/",
			)
		) {
			throw new UnprocessableEntityError(
				"Uploaded profile image was not found.",
				"PROFILE_IMAGE_NOT_FOUND",
			);
		}

		const [updatedPage] = await db
			.update(pages)
			.set({
				image: input.sourceObjectKey,
				imageSource:
					input.sourceObjectKey,
				imageCrop: input.crop,
				updatedAt: new Date(),
			})
			.where(
				profileImageOperationWhere({
					pageId: page.id,
					userId,
					expectedImage:
						input.expectedImage,
				}),
			)
			.returning();
		if (!updatedPage) {
			throw new ConflictError(
				"Profile image changed while it was being uploaded.",
				"PROFILE_IMAGE_OPERATION_STALE",
			);
		}

		await deleteProfileObjects({
			env,
			keys: [
				page.image,
				page.imageSource,
			].filter(
				(key): key is string =>
					typeof key === "string" &&
					(isProfileImageKey(key) ||
						isLegacyProfileImageKey(
							key,
						)),
			),
			protectedKeys: [
				updatedPage.image,
				updatedPage.imageSource,
			],
		});

		return updatedPage;
	};
