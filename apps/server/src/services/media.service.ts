import {
	type PageItemUploadRequest,
	pageItemUploadCompleteResponseSchema,
	pageItemUploadRequestSchema,
	pageItemUploadResponseSchema,
} from "@grabbin/api";
import type { DatabaseClient } from "@grabbin/db";
import { pageItemUploads } from "@grabbin/db/schema/index";
import { AwsClient } from "aws4fetch";
import { and, eq, inArray, lte } from "drizzle-orm";
import * as v from "valibot";
import { PageItemServiceError } from "../exceptions/page-item.exception";

const imageExtensions = {
	"image/avif": "avif",
	"image/gif": "gif",
	"image/jpeg": "jpg",
	"image/png": "png",
	"image/webp": "webp",
} as const;

const ITEM_MEDIA_UPLOAD_TTL_MS = 15 * 60 * 1000;
const uploadSessionStatuses = ["pending", "uploaded"] as const;
type UploadSessionStatus = (typeof uploadSessionStatuses)[number];

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
	db: DatabaseClient;
	bucket: R2Bucket;
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
	const uploadId = crypto.randomUUID();
	try {
		await input.db.insert(pageItemUploads).values({
			id: uploadId,
			userId: input.userId,
			pageId: input.pageId,
			itemId: parsed.output.itemId,
			objectKey,
			contentType: parsed.output.contentType,
			status: "pending",
			expiresAt: new Date(Date.now() + ITEM_MEDIA_UPLOAD_TTL_MS),
		});
	} catch (error) {
		await input.bucket.delete(objectKey).catch(() => undefined);
		throw error;
	}
	return v.parse(pageItemUploadResponseSchema, {
		uploadId,
		objectKey,
		uploadUrl: upload.url,
		expiresAt: upload.expiresAt,
	});
}

export async function completeItemMediaUpload(input: {
	db: DatabaseClient;
	bucket: R2Bucket;
	userId: string;
	pageId: string;
	uploadId: string;
}) {
	const upload = await input.db.query.pageItemUploads.findFirst({
		where: and(
			eq(pageItemUploads.id, input.uploadId),
			eq(pageItemUploads.userId, input.userId),
			eq(pageItemUploads.pageId, input.pageId),
		),
	});
	if (
		!upload ||
		!uploadSessionStatuses.includes(upload.status as UploadSessionStatus) ||
		upload.expiresAt <= new Date()
	)
		throw new PageItemServiceError("MEDIA_UPLOAD_NOT_FOUND");
	if (
		!isOwnedPageMediaKey({
			key: upload.objectKey,
			userId: input.userId,
			pageId: input.pageId,
			scope: "items",
		})
	) {
		throw new PageItemServiceError("INVALID_MEDIA_KEY");
	}

	const object = await input.bucket.head(upload.objectKey);
	const mimeType = object?.httpMetadata?.contentType ?? "";
	if (
		!object ||
		object.size < 1 ||
		mimeType !== upload.contentType ||
		!/^(image|video)\//i.test(mimeType)
	) {
		throw new PageItemServiceError("ITEM_MEDIA_NOT_FOUND");
	}

	if (upload.status === "pending") {
		await input.db
			.update(pageItemUploads)
			.set({ status: "uploaded", updatedAt: new Date() })
			.where(
				and(
					eq(pageItemUploads.id, input.uploadId),
					eq(pageItemUploads.status, "pending"),
				),
			);
	}

	return v.parse(pageItemUploadCompleteResponseSchema, {
		objectKey: upload.objectKey,
		mimeType,
		size: object.size,
	});
}

export async function cancelItemMediaUpload(input: {
	db: DatabaseClient;
	bucket: R2Bucket;
	userId: string;
	pageId: string;
	uploadId: string;
}) {
	const upload = await input.db.query.pageItemUploads.findFirst({
		where: and(
			eq(pageItemUploads.id, input.uploadId),
			eq(pageItemUploads.userId, input.userId),
			eq(pageItemUploads.pageId, input.pageId),
		),
	});
	if (!upload) throw new PageItemServiceError("MEDIA_UPLOAD_NOT_FOUND");
	await input.db
		.update(pageItemUploads)
		.set({ status: "canceling", updatedAt: new Date() })
		.where(
			and(
				eq(pageItemUploads.id, input.uploadId),
				eq(pageItemUploads.status, upload.status),
			),
		);
	await input.bucket.delete(upload.objectKey);
	await input.db
		.delete(pageItemUploads)
		.where(eq(pageItemUploads.id, input.uploadId));
}

export async function cleanupExpiredItemMediaUploads({
	db,
	bucket,
	now = new Date(),
}: {
	db: DatabaseClient;
	bucket: R2Bucket;
	now?: Date;
}) {
	const expired = await db.query.pageItemUploads.findMany({
		where: lte(pageItemUploads.expiresAt, now),
		columns: { id: true, objectKey: true },
	});
	const results = await Promise.allSettled(
		expired.map((upload) => bucket.delete(upload.objectKey)),
	);
	const deletedIds = expired
		.filter((_, index) => results[index]?.status === "fulfilled")
		.map((upload) => upload.id);
	if (deletedIds.length) {
		await db
			.delete(pageItemUploads)
			.where(inArray(pageItemUploads.id, deletedIds));
	}
	return deletedIds.length;
}
