import type { PageItemUploadRequest } from "@grabbin/api";
import {
	MAX_ITEM_MEDIA_SIZE as SHARED_MAX_ITEM_MEDIA_SIZE,
	MAX_PROFILE_IMAGE_SIZE as SHARED_MAX_PROFILE_IMAGE_SIZE,
} from "@grabbin/api";
import { AwsClient } from "aws4fetch";

export const LEGACY_PROFILE_IMAGE_PREFIX =
	"users/profile/";
export const MAX_PROFILE_IMAGE_SIZE =
	SHARED_MAX_PROFILE_IMAGE_SIZE;
export const PROFILE_IMAGE_UPLOAD_TTL_SECONDS =
	10 * 60;
export const PROFILE_IMAGE_DISPLAY_CONTENT_TYPE =
	"image/webp";
export const PROFILE_IMAGE_DISPLAY_CACHE_CONTROL =
	"no-cache, must-revalidate";
export const MAX_ITEM_MEDIA_SIZE =
	SHARED_MAX_ITEM_MEDIA_SIZE;
export const ITEM_MEDIA_PREFIX =
	"users/";
export const ITEM_MEDIA_UPLOAD_TTL_SECONDS =
	10 * 60;

const supportedImageTypes = new Map([
	["image/avif", "avif"],
	["image/gif", "gif"],
	["image/jpeg", "jpg"],
	["image/png", "png"],
	["image/webp", "webp"],
]);

const supportedDisplayImageTypes =
	new Map([
		["image/jpeg", "jpg"],
		["image/webp", "webp"],
	]);

const displayImageTypesByExtension =
	new Map([
		["jpg", "image/jpeg"],
		["webp", "image/webp"],
	]);

const mediaTypePattern =
	/^(image|video)\/[a-z0-9.+-]+$/i;

export const isProfileImageKey = (
	value: string,
) =>
	/^users\/[^/]+\/[^/]+\/profile\/[^/]+$/.test(
		value,
	) &&
	!value.includes("..") &&
	!value.includes("\\");

export const isLegacyProfileImageKey = (
	value: string,
) =>
	/^users\/profile\/[^/]+$/.test(
		value,
	) &&
	!value.includes("..") &&
	!value.includes("\\");

export const createProfileImageKey = (
	userId: string,
	pageId: string,
	contentType: string,
) => {
	const extension =
		supportedImageTypes.get(
			contentType,
		);

	if (!extension) return null;
	if (
		!isSafePathSegment(userId) ||
		!isSafePathSegment(pageId)
	)
		return null;
	return `users/${userId}/${pageId}/profile/${crypto.randomUUID()}.${extension}`;
};

export const createProfileImageCropKey =
	(
		userId: string,
		pageId: string,
		sourceObjectKey: string,
		contentType = PROFILE_IMAGE_DISPLAY_CONTENT_TYPE,
	) => {
		if (
			!isSafePathSegment(userId) ||
			!isSafePathSegment(pageId)
		)
			return null;
		const sourceFilename =
			sourceObjectKey.split("/").pop();
		const sourceBase =
			sourceFilename?.replace(
				/\.[^.]+$/,
				"",
			);
		const extension =
			supportedDisplayImageTypes.get(
				contentType,
			);
		if (
			!sourceBase ||
			!isSafePathSegment(sourceBase) ||
			!extension
		)
			return null;
		return `users/${userId}/${pageId}/profile/${sourceBase}-crop.${extension}`;
	};

export const createProfileImageStagingKey =
	(
		userId: string,
		pageId: string,
		sourceObjectKey: string,
		contentType = PROFILE_IMAGE_DISPLAY_CONTENT_TYPE,
	) => {
		const cropKey =
			createProfileImageCropKey(
				userId,
				pageId,
				sourceObjectKey,
				contentType,
			);
		if (!cropKey) return null;
		return cropKey.replace(
			/\.(jpg|webp)$/,
			`.upload-${crypto.randomUUID()}.$1`,
		);
	};

export const isProfileImageCropKey = (
	value: string,
) =>
	/^users\/[^/]+\/[^/]+\/profile\/[^/]+-crop\.(?:jpg|webp)$/.test(
		value,
	) &&
	!value.includes("..") &&
	!value.includes("\\");

export const isProfileImageStagingKey =
	(value: string) =>
		/^users\/[^/]+\/[^/]+\/profile\/[^/]+-crop\.upload-[a-f0-9-]+\.(?:jpg|webp)$/.test(
			value,
		) &&
		!value.includes("..") &&
		!value.includes("\\");

export const getProfileImageDisplayContentType =
	(value: string) => {
		const extension = value
			.split(".")
			.pop();
		return extension
			? (displayImageTypesByExtension.get(
					extension,
				) ?? null)
			: null;
	};

export const isItemMediaKey = (
	value: string,
) =>
	/^users\/[^/]+\/[^/]+\/[^/]+$/.test(
		value,
	) &&
	!value.includes("..") &&
	!value.includes("\\");

export const sanitizeMediaFilename = (
	filename: string,
) => {
	if (
		filename.includes("/") ||
		filename.includes("\\") ||
		filename === "." ||
		filename === ".."
	)
		return null;
	const sanitized = filename
		.normalize("NFKC")
		.replace(/[^a-zA-Z0-9._-]/g, "-")
		.replace(/-+/g, "-")
		.replace(/^[-.]+|[-.]+$/g, "")
		.slice(0, 120);
	return sanitized || null;
};

const isSafePathSegment = (
	value: string,
) =>
	/^[a-zA-Z0-9_-]+$/.test(value) &&
	value !== "." &&
	value !== "..";

export const createItemMediaKey = ({
	userId,
	pageId,
	filename,
}: Pick<
	PageItemUploadRequest,
	"filename"
> & {
	userId: string;
	pageId: string;
}) => {
	const sanitized =
		sanitizeMediaFilename(filename);
	if (
		!sanitized ||
		!isSafePathSegment(userId) ||
		!isSafePathSegment(pageId)
	)
		return null;
	return `users/${userId}/${pageId}/${sanitized}`;
};

export const validateItemMediaUpload =
	({
		contentType,
		size,
	}: Pick<
		PageItemUploadRequest,
		"contentType" | "size"
	>) =>
		mediaTypePattern.test(
			contentType,
		) && size <= MAX_ITEM_MEDIA_SIZE;

export const getItemMediaUrl = (
	publicBaseUrl: string | undefined,
	objectKey: string,
) =>
	publicBaseUrl &&
	isItemMediaKey(objectKey)
		? getPublicR2ObjectUrl(
				publicBaseUrl,
				objectKey,
			)
		: undefined;

export const getPublicR2ObjectUrl = (
	publicBaseUrl: string | undefined,
	objectKey: string,
) =>
	publicBaseUrl
		? `${publicBaseUrl.replace(/\/+$/, "")}/${objectKey.split("/").map(encodeURIComponent).join("/")}`
		: undefined;

export const validateProfileImageUpload =
	(input: {
		contentType: string;
		size: number;
	}) =>
		input.size <=
			MAX_PROFILE_IMAGE_SIZE &&
		supportedImageTypes.has(
			input.contentType,
		);

export async function createProfileImageUploadUrl({
	accountId,
	accessKeyId,
	secretAccessKey,
	objectKey,
	contentType,
	cacheControl,
	now = new Date(),
}: {
	accountId: string;
	accessKeyId: string;
	secretAccessKey: string;
	objectKey: string;
	contentType: string;
	cacheControl?: string;
	now?: Date;
}) {
	return createSignedUploadUrl({
		accountId,
		accessKeyId,
		secretAccessKey,
		objectKey,
		contentType,
		cacheControl,
		ttlSeconds:
			PROFILE_IMAGE_UPLOAD_TTL_SECONDS,
		now,
	});
}

export async function createItemMediaUploadUrl({
	accountId,
	accessKeyId,
	secretAccessKey,
	objectKey,
	contentType,
	now = new Date(),
}: Omit<
	Parameters<
		typeof createProfileImageUploadUrl
	>[0],
	"cacheControl"
>) {
	return createSignedUploadUrl({
		accountId,
		accessKeyId,
		secretAccessKey,
		objectKey,
		contentType,
		ttlSeconds:
			ITEM_MEDIA_UPLOAD_TTL_SECONDS,
		now,
	});
}

async function createSignedUploadUrl({
	accountId,
	accessKeyId,
	secretAccessKey,
	objectKey,
	contentType,
	cacheControl,
	ttlSeconds,
	now,
}: {
	accountId: string;
	accessKeyId: string;
	secretAccessKey: string;
	objectKey: string;
	contentType: string;
	cacheControl?: string;
	ttlSeconds: number;
	now: Date;
}) {
	const region = "auto";
	const service = "s3";
	const host = `${accountId}.r2.cloudflarestorage.com`;
	const bucket = "test-images";
	const amzDate = now
		.toISOString()
		.replace(/[:-]|\.\d{3}/g, "");
	const url = new URL(
		`https://${host}/${bucket}/${objectKey}`,
	);
	url.searchParams.set(
		"X-Amz-Expires",
		String(ttlSeconds),
	);
	const headers = new Headers({
		"content-type": contentType,
	});
	if (cacheControl) {
		headers.set(
			"cache-control",
			cacheControl,
		);
	}
	const signedRequest =
		await new AwsClient({
			accessKeyId,
			secretAccessKey,
			region,
			service,
		}).sign(url, {
			method: "PUT",
			headers,
			aws: {
				datetime: amzDate,
				signQuery: true,
				allHeaders: true,
			},
		});

	return {
		objectKey,
		uploadUrl:
			signedRequest.url.toString(),
		expiresAt: new Date(
			now.getTime() + ttlSeconds * 1000,
		).toISOString(),
	};
}
