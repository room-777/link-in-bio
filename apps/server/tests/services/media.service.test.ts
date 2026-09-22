import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { PageItemServiceError } from "../../src/exceptions/page-item.exception";
import {
	cancelItemMediaUpload,
	completeItemMediaUpload,
	createPageItemMediaKey,
	createPageLinkImageKey,
	isOwnedPageLinkImageKey,
} from "../../src/services/media.service";

const objectKey = createPageItemMediaKey({
	userId: "user-1",
	pageId: "page-1",
	contentType: "image/jpeg",
});

describe("page item media service", () => {
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
		const deletedKeys: string[] = [];
		const bucket = {
			delete: async (key: string) => {
				deletedKeys.push(key);
			},
		} as unknown as R2Bucket;

		await cancelItemMediaUpload({
			bucket,
			userId: "user-1",
			pageId: "page-1",
			objectKey,
		});

		assert.deepEqual(deletedKeys, [objectKey]);
	});

	it("rejects cancelling a foreign object key", async () => {
		const deletedKeys: string[] = [];
		const bucket = {
			delete: async (key: string) => {
				deletedKeys.push(key);
			},
		} as unknown as R2Bucket;

		await assert.rejects(
			cancelItemMediaUpload({
				bucket,
				userId: "user-1",
				pageId: "page-1",
				objectKey: "users/other/pages/page-1/items/image.jpg",
			}),
			(error: unknown) =>
				error instanceof PageItemServiceError &&
				error.code === "INVALID_MEDIA_KEY",
		);
		assert.deepEqual(deletedKeys, []);
	});
});
