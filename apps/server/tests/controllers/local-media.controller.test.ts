import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { Hono } from "hono";
import { localMediaController } from "../../src/controllers/local-media.controller";
import type { AppEnv } from "../../src/types";

describe("local media controller", () => {
	/**
	 * Case ID: LOCAL-MEDIA-001
	 * Given: local mode has an image in the R2 bucket.
	 * When: the image is requested through /media.
	 * Then: the image body and stored content type are returned.
	 * Evidence: response status, content-type, and body.
	 * Result: Pass
	 */
	it("LOCAL-MEDIA-001 serves R2 objects only in local mode", async () => {
		let requestedKey = "";
		const app = new Hono<AppEnv>().route("/media", localMediaController);
		const env = {
			R2_LOCAL_MODE: "true",
			R2_BUCKET: {
				get: async (key: string) => {
					requestedKey = key;
					return {
						body: new ReadableStream({
							start(controller) {
								controller.enqueue(new TextEncoder().encode("image-bytes"));
								controller.close();
							},
						}),
						httpMetadata: { contentType: "image/jpeg" },
					} as R2ObjectBody;
				},
			} as unknown as R2Bucket,
		} as AppEnv["Bindings"];

		const response = await app.request(
			"/media/users/user-1/pages/page-1/profile/image.jpg",
			{},
			env,
		);

		assert.equal(response.status, 200);
		assert.equal(requestedKey, "users/user-1/pages/page-1/profile/image.jpg");
		assert.equal(response.headers.get("content-type"), "image/jpeg");
		assert.equal(await response.text(), "image-bytes");
	});

	/**
	 * Case ID: LOCAL-MEDIA-002
	 * Given: local mode is disabled.
	 * When: a user media key is requested.
	 * Then: the route returns 404 without reading R2.
	 * Evidence: response status and R2 read count.
	 * Result: Pass
	 */
	it("LOCAL-MEDIA-002 does not expose objects outside local mode", async () => {
		let reads = 0;
		const app = new Hono<AppEnv>().route("/media", localMediaController);
		const env = {
			R2_LOCAL_MODE: "false",
			R2_BUCKET: {
				get: async () => {
					reads += 1;
					return null;
				},
			} as unknown as R2Bucket,
		} as AppEnv["Bindings"];

		const response = await app.request(
			"/media/users/user-1/image.jpg",
			{},
			env,
		);

		assert.equal(response.status, 404);
		assert.equal(reads, 0);
	});
});
