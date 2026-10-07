import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { PageItemServiceError } from "../../src/exceptions/page-item.exception";
import {
	cancelItemMediaUpload,
	completeItemMediaUpload,
	createPageItemMediaKey,
	createPageLinkImageKey,
	createPresignedPutUrl,
	getPublicPageItemMediaUrl,
	isOwnedPageLinkImageKey,
} from "../../src/services/media.service";

const objectKey = createPageItemMediaKey({
	userId: "user-1",
	pageId: "page-1",
	contentType: "image/jpeg",
});

describe("page item media service", () => {
	/**
	 * Case ID: MEDIA-UPLOAD-001
	 * Given: Alchemy supplies local R2 S3 credentials to the server.
	 * When: the server creates a direct-upload URL.
	 * Then: the signed URL targets the supplied local S3 endpoint and bucket.
	 * Evidence: URL origin and path match the local R2 endpoint.
	 * Result: Pass
	 */
	it("MEDIA-UPLOAD-001 signs uploads for the configured R2 endpoint", async () => {
		const upload = await createPresignedPutUrl({
			s3Credentials: JSON.stringify({
				endpoint: "http://localhost:1337/cdn-cgi/local/r2/s3",
				bucketName: "grabbin",
				region: "auto",
				accessKeyId: "local-access-key",
				secretAccessKey: "local-secret-key",
			}),
			key: "users/user-1/pages/page-1/profile/image.jpg",
			contentType: "image/jpeg",
		});

		const uploadUrl = new URL(upload.url);
		assert.equal(uploadUrl.origin, "http://localhost:1337");
		assert.equal(
			uploadUrl.pathname,
			"/cdn-cgi/local/r2/s3/grabbin/users/user-1/pages/page-1/profile/image.jpg",
		);
	});

	/**
	 * Case ID: MEDIA-URL-001
	 * Given: an object key and local or production public base URL.
	 * When: the API builds the image URL.
	 * Then: local images use the local media route and production keeps the CDN path.
	 * Evidence: returned URL for each environment.
	 * Result: Pass
	 */
	it("MEDIA-URL-001 builds local and production media URLs", () => {
		const key = "users/user-1/pages/page-1/profile/image.jpg";
		assert.equal(
			getPublicPageItemMediaUrl("http://localhost:1337", key),
			"http://localhost:1337/media/users/user-1/pages/page-1/profile/image.jpg",
		);
		assert.equal(
			getPublicPageItemMediaUrl("https://cdn.example.com", key),
			"https://cdn.example.com/users/user-1/pages/page-1/profile/image.jpg",
		);
	});

	it("creates link image keys inside the owning item prefix", () => {
		const linkImageKey = createPageLinkImageKey({
			userId: "user-1",
			pageId: "page-1",
			itemId: "link-1",
			contentType: "image/webp",
		});

		assert.match(
			linkImageKey,
			/^users\/user-1\/pages\/page-1\/items\/link-1\/image\/[0-9a-f-]+\.webp$/,
		);
		assert.equal(
			isOwnedPageLinkImageKey({
				key: linkImageKey,
				userId: "user-1",
				pageId: "page-1",
				itemId: "link-1",
			}),
			true,
		);
		assert.equal(
			isOwnedPageLinkImageKey({
				key: linkImageKey,
				userId: "user-1",
				pageId: "page-1",
				itemId: "other-link",
			}),
			false,
		);
	});

	it("rejects a foreign object key before reading storage", async () => {
		let headCalls = 0;
		const bucket = {
			head: async () => {
				headCalls += 1;
				return null;
			},
		} as unknown as R2Bucket;
		await assert.rejects(
			completeItemMediaUpload({
				bucket,
				userId: "user-1",
				pageId: "page-1",
				objectKey: "users/other/pages/page-1/items/image.jpg",
			}),
			(error: unknown) =>
				error instanceof PageItemServiceError &&
				error.code === "INVALID_MEDIA_KEY",
		);
		assert.equal(headCalls, 0);
	});

	it("returns metadata for a stored owned object", async () => {
		const bucket = {
			head: async () => ({
				size: 42,
				httpMetadata: { contentType: "image/jpeg" },
			}),
		} as unknown as R2Bucket;

		assert.deepEqual(
			await completeItemMediaUpload({
				bucket,
				userId: "user-1",
				pageId: "page-1",
				objectKey,
			}),
			{
				objectKey,
				mimeType: "image/jpeg",
				size: 42,
			},
		);
	});

	it("cancels an owned object", async () => {
		const db = {
			update: () => ({
				set: () => ({
					where: () => ({
						returning: async () => [{ objectKey }],
					}),
				}),
			}),
			delete: () => ({ where: async () => undefined }),
		} as unknown as import("@grabbin/db").DatabaseClient;

		await cancelItemMediaUpload({
			db,
			userId: "user-1",
			pageId: "page-1",
			objectKey,
		});
	});

	it("rejects cancelling a foreign object key", async () => {
		await assert.rejects(
			cancelItemMediaUpload({
				db: {} as import("@grabbin/db").DatabaseClient,
				userId: "user-1",
				pageId: "page-1",
				objectKey: "users/other/pages/page-1/items/image.jpg",
			}),
			(error: unknown) =>
				error instanceof PageItemServiceError &&
				error.code === "INVALID_MEDIA_KEY",
		);
	});
});
