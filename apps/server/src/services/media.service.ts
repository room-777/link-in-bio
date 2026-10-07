import {
	type PageItemUploadRequest,
	pageItemUploadCompleteResponseSchema,
	pageItemUploadRequestSchema,
	pageItemUploadResponseSchema,
} from "@grabbin/api";
import { cancelPendingPageMedia } from "@grabbin/application/media-assets";
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

export function createPageLinkImageKey(input: {
	userId: string;
	pageId: string;
	itemId: string;
	contentType: string;
}) {
	return `users/${input.userId}/pages/${input.pageId}/items/${input.itemId}/image/${crypto.randomUUID()}.${getMediaExtension(input.contentType)}`;
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

function isSafePageItemId(itemId: string) {
	return /^[^/]+$/.test(itemId) && !itemId.includes("..");
}

export function isOwnedPageLinkImageKey(input: {
	key: string;
	userId: string;
	pageId: string;
	itemId: string;
}) {
	if (!isSafePageItemId(input.itemId)) return false;
	const prefix = `users/${input.userId}/pages/${input.pageId}/items/${input.itemId}/image/`;
	return (
		input.key === input.key.trim() &&
		!input.key.includes("..") &&
		input.key.startsWith(prefix) &&
		input.key.length > prefix.length
	);
}

function isOwnedItemUploadKey(input: {
	key: string;
	userId: string;
	pageId: string;
	itemId?: string;
	kind?: "link-image";
}) {
	if (input.kind === "link-image") {
		return Boolean(
			input.itemId &&
				isOwnedPageLinkImageKey({
					key: input.key,
					userId: input.userId,
					pageId: input.pageId,
					itemId: input.itemId,
				}),
		);
	}
	return isOwnedPageMediaKey({
		key: input.key,
		userId: input.userId,
		pageId: input.pageId,
		scope: "items",
	});
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
	let objectKey: string;
	if (parsed.output.kind === "link-image") {
		const itemId = parsed.output.itemId;
		if (
			!itemId ||
			!isSafePageItemId(itemId) ||
			!/^image\//i.test(parsed.output.contentType)
		) {
			throw new PageItemServiceError("INVALID_MEDIA_UPLOAD");
		}
		objectKey = createPageLinkImageKey({
			userId: input.userId,
			pageId: input.pageId,
			itemId,
			contentType: parsed.output.contentType,
		});
	} else {
		objectKey = createPageItemMediaKey({
			userId: input.userId,
			pageId: input.pageId,
			contentType: parsed.output.contentType,
		});
	}
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
	itemId?: string;
	kind?: "link-image";
}) {
	if (
		!isOwnedItemUploadKey({
			key: input.objectKey,
			userId: input.userId,
			pageId: input.pageId,
			itemId: input.itemId,
			kind: input.kind,
		})
	) {
		throw new PageItemServiceError("INVALID_MEDIA_KEY");
	}

	const object = await input.bucket.head(input.objectKey);
	const mimeType = object?.httpMetadata?.contentType ?? "";
	if (
		!object ||
		object.size < 1 ||
		(input.kind === "link-image"
			? !/^image\//i.test(mimeType)
			: !/^(image|video)\//i.test(mimeType))
	) {
		throw new PageItemServiceError("ITEM_MEDIA_NOT_FOUND");
	}

	return v.parse(pageItemUploadCompleteResponseSchema, {
		objectKey: input.objectKey,
		mimeType,
		size: object.size,
	});
}

export async function cancelItemMediaUpload(input: {
	db: import("@grabbin/db").DatabaseClient;
	userId: string;
	pageId: string;
	objectKey: string;
	itemId?: string;
	kind?: "link-image";
}) {
	if (
		!isOwnedItemUploadKey({
			key: input.objectKey,
			userId: input.userId,
			pageId: input.pageId,
			itemId: input.itemId,
			kind: input.kind,
		})
	)
		throw new PageItemServiceError("INVALID_MEDIA_KEY");
	await cancelPendingPageMedia({
		db: input.db,
		objectKey: input.objectKey,
		pageId: input.pageId,
		userId: input.userId,
	});
}
