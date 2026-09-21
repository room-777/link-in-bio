import {
	type PageItemUploadRequest,
	pageItemUploadCompleteResponseSchema,
	pageItemUploadRequestSchema,
	pageItemUploadResponseSchema,
} from "@grabbin/api";
import { AwsClient } from "aws4fetch";
import * as v from "valibot";
import { PageItemServiceError } from "../exceptions/page-item.exception";

const imageExtensions = {
	"image/avif": "avif",
	"image/gif": "gif",
	"image/jpeg": "jpg",
	"image/png": "png",
	"image/webp": "webp",
} as const;

export function createPageImageKey(input: {
	userId: string;
	pageId: string;
	contentType: keyof typeof imageExtensions;
}) {
	return `users/${input.userId}/pages/${input.pageId}/profile/${crypto.randomUUID()}.${imageExtensions[input.contentType]}`;
}

function getMediaExtension(contentType: string) {
	const subtype = contentType.split("/")[1]?.split(/[+;]/, 1)[0];
	const extension = subtype?.replace(/[^a-z0-9]/gi, "").toLowerCase();
	return extension || "media";
}

export function createPageItemMediaKey(input: {
	userId: string;
	pageId: string;
	contentType: string;
}) {
	return `users/${input.userId}/pages/${input.pageId}/items/${crypto.randomUUID()}.${getMediaExtension(input.contentType)}`;
}

export function isOwnedPageMediaKey(input: {
	key: string;
	userId: string;
	pageId: string;
	scope: "profile" | "items";
}) {
	const prefix = `users/${input.userId}/pages/${input.pageId}/${input.scope}/`;
	return (
		input.key === input.key.trim() &&
		!input.key.includes("..") &&
		input.key.startsWith(prefix) &&
		input.key.length > prefix.length
	);
}

export function getPublicPageItemMediaUrl(
	publicBaseUrl: string | undefined,
	objectKey: string,
) {
	const base = publicBaseUrl?.trim().replace(/\/+$/, "");
	if (!base) return undefined;

	try {
		if (new URL(base).protocol !== "https:") return undefined;
	} catch {
		return undefined;
	}

	return `${base}/${objectKey
		.split("/")
		.map((segment) => encodeURIComponent(segment))
		.join("/")}`;
}

export async function createPresignedPutUrl(input: {
	accountId: string;
	bucketName: string;
	accessKeyId: string;
	secretAccessKey: string;
	key: string;
	contentType: string;
	expiresInSeconds?: number;
}) {
	const expiresInSeconds = input.expiresInSeconds ?? 900;
	const endpoint = new URL(
		`https://${input.accountId}.r2.cloudflarestorage.com/${input.bucketName}/${input.key}`,
	);
	endpoint.searchParams.set("X-Amz-Expires", String(expiresInSeconds));

	const request = await new AwsClient({
		accessKeyId: input.accessKeyId,
		secretAccessKey: input.secretAccessKey,
		service: "s3",
		region: "auto",
	}).sign(
		new Request(endpoint, {
			method: "PUT",
			headers: { "Content-Type": input.contentType },
		}),
		{ aws: { signQuery: true } },
	);

	return {
		url: request.url,
		expiresAt: new Date(Date.now() + expiresInSeconds * 1000).toISOString(),
	};
}

export async function createItemMediaUpload(input: {
	accountId: string;
	bucketName: string;
	accessKeyId: string;
	secretAccessKey: string;
	userId: string;
	pageId: string;
	request: PageItemUploadRequest;
}) {
	const parsed = v.safeParse(pageItemUploadRequestSchema, input.request);
	if (!parsed.success) {
		throw new PageItemServiceError("INVALID_MEDIA_UPLOAD");
	}
	const objectKey = createPageItemMediaKey({
		userId: input.userId,
		pageId: input.pageId,
		contentType: parsed.output.contentType,
	});
	const upload = await createPresignedPutUrl({
		accountId: input.accountId,
		bucketName: input.bucketName,
		accessKeyId: input.accessKeyId,
		secretAccessKey: input.secretAccessKey,
		key: objectKey,
		contentType: parsed.output.contentType,
	});
	return v.parse(pageItemUploadResponseSchema, {
		objectKey,
		uploadUrl: upload.url,
		expiresAt: upload.expiresAt,
	});
}

export async function completeItemMediaUpload(input: {
	bucket: R2Bucket;
	userId: string;
	pageId: string;
	objectKey: string;
}) {
	if (
		!isOwnedPageMediaKey({
			key: input.objectKey,
			userId: input.userId,
			pageId: input.pageId,
			scope: "items",
		})
	) {
		throw new PageItemServiceError("INVALID_MEDIA_KEY");
	}

	const object = await input.bucket.head(input.objectKey);
	const mimeType = object?.httpMetadata?.contentType ?? "";
	if (!object || object.size < 1 || !/^(image|video)\//i.test(mimeType)) {
		throw new PageItemServiceError("ITEM_MEDIA_NOT_FOUND");
	}

	return v.parse(pageItemUploadCompleteResponseSchema, {
		objectKey: input.objectKey,
		mimeType,
		size: object.size,
	});
}

export async function cancelItemMediaUpload(input: {
	bucket: R2Bucket;
	userId: string;
	pageId: string;
	objectKey: string;
}) {
	if (
		!isOwnedPageMediaKey({
			key: input.objectKey,
			userId: input.userId,
			pageId: input.pageId,
			scope: "items",
		})
	)
		throw new PageItemServiceError("INVALID_MEDIA_KEY");
	await input.bucket.delete(input.objectKey);
}
