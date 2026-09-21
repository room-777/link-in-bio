import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { PageItemServiceError } from "../../src/exceptions/page-item.exception";
import {
	completeItemMediaUpload,
	createPageItemMediaKey,
} from "../../src/services/media.service";

describe("page item media service", () => {
	it("rejects a media key outside the owner page prefix", async () => {
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
				objectKey: "users/other/pages/page-1/items/file.jpg",
			}),
			(error: unknown) =>
				error instanceof PageItemServiceError &&
				error.code === "INVALID_MEDIA_KEY",
		);
		assert.equal(headCalls, 0);
	});

	it("returns the uploaded media metadata for an owned key", async () => {
		const objectKey = createPageItemMediaKey({
			userId: "user-1",
			pageId: "page-1",
			contentType: "image/jpeg",
		});
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
			{ objectKey, mimeType: "image/jpeg", size: 42 },
		);
	});
});
