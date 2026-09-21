import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { PageItemServiceError } from "../../src/exceptions/page-item.exception";
import {
	cancelItemMediaUpload,
	cleanupExpiredItemMediaUploads,
	completeItemMediaUpload,
	createItemMediaUpload,
	createPageItemMediaKey,
} from "../../src/services/media.service";

function createUpload(overrides: Partial<Record<string, unknown>> = {}) {
	return {
		id: "upload-1",
		userId: "user-1",
		pageId: "page-1",
		itemId: "item-1",
		objectKey: createPageItemMediaKey({
			userId: "user-1",
			pageId: "page-1",
			contentType: "image/jpeg",
		}),
		contentType: "image/jpeg",
		status: "pending",
		expiresAt: new Date("2026-09-22T00:00:00.000Z"),
		...overrides,
	};
}

function createDb(upload: Record<string, unknown> | undefined) {
	let deleted = false;
	const db = {
		query: {
			pageItemUploads: {
				findFirst: async () => (deleted ? undefined : upload),
				findMany: async () => (deleted || !upload ? [] : [upload]),
			},
		},
		update: () => ({
			set: () => ({ where: async () => undefined }),
		}),
		delete: () => ({
			where: async () => {
				deleted = true;
			},
		}),
	};
	return { db, wasDeleted: () => deleted };
}

describe("page item media service", () => {
	it("rejects a missing upload session before reading storage", async () => {
		let headCalls = 0;
		const bucket = {
			head: async () => {
				headCalls += 1;
				return null;
			},
		} as unknown as R2Bucket;
		const { db } = createDb(undefined);

		await assert.rejects(
			completeItemMediaUpload({
				db: db as never,
				bucket,
				userId: "user-1",
				pageId: "page-1",
				uploadId: "upload-1",
			}),
			(error: unknown) =>
				error instanceof PageItemServiceError &&
				error.code === "MEDIA_UPLOAD_NOT_FOUND",
		);
		assert.equal(headCalls, 0);
	});

	it("returns uploaded media metadata and advances the session", async () => {
		const upload = createUpload();
		const { db } = createDb(upload);
		const bucket = {
			head: async () => ({
				size: 42,
				httpMetadata: { contentType: "image/jpeg" },
			}),
		} as unknown as R2Bucket;

		assert.deepEqual(
			await completeItemMediaUpload({
				db: db as never,
				bucket,
				userId: "user-1",
				pageId: "page-1",
				uploadId: "upload-1",
			}),
			{
				objectKey: upload.objectKey,
				mimeType: "image/jpeg",
				size: 42,
			},
		);
	});

	it("cancels storage and the upload session together", async () => {
		const upload = createUpload({ status: "uploaded" });
		const { db, wasDeleted } = createDb(upload);
		const deletedKeys: string[] = [];
		const bucket = {
			delete: async (key: string) => {
				deletedKeys.push(key);
			},
		} as unknown as R2Bucket;

		await cancelItemMediaUpload({
			db: db as never,
			bucket,
			userId: "user-1",
			pageId: "page-1",
			uploadId: "upload-1",
		});

		assert.deepEqual(deletedKeys, [upload.objectKey]);
		assert.equal(wasDeleted(), true);
	});

	it("removes expired objects and sessions when cleanup runs", async () => {
		const upload = createUpload({
			expiresAt: new Date("2026-09-20T00:00:00.000Z"),
		});
		const { db, wasDeleted } = createDb(upload);
		const bucket = {
			delete: async () => undefined,
		} as unknown as R2Bucket;

		assert.equal(
			await cleanupExpiredItemMediaUploads({
				db: db as never,
				bucket,
				now: new Date("2026-09-21T00:00:00.000Z"),
			}),
			1,
		);
		assert.equal(wasDeleted(), true);
	});

	it("removes the presigned object when session creation fails", async () => {
		const deletedKeys: string[] = [];
		const bucket = {
			delete: async (key: string) => {
				deletedKeys.push(key);
			},
		} as unknown as R2Bucket;
		const db = {
			insert: () => ({
				values: async () => {
					throw new Error("database unavailable");
				},
			}),
		};

		await assert.rejects(
			createItemMediaUpload({
				db: db as never,
				bucket,
				accountId: "account",
				bucketName: "bucket",
				accessKeyId: "access",
				secretAccessKey: "secret",
				userId: "user-1",
				pageId: "page-1",
				request: {
					itemId: "item-1",
					contentType: "image/jpeg",
					size: 1,
				},
			}),
			/database unavailable/,
		);
		assert.equal(deletedKeys.length, 1);
	});
});
