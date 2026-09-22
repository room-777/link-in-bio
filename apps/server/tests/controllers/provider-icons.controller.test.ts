import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { Hono } from "hono";

import { providerIconsController } from "../../src/controllers/provider-icons.controller";
import type { AppEnv } from "../../src/types";

function createApp(bucket: R2Bucket) {
	return {
		app: new Hono<AppEnv>().route("/provider-icons", providerIconsController),
		env: { R2_BUCKET: bucket } as AppEnv["Bindings"],
	};
}

describe("provider icons controller", () => {
	it("returns the cached SVG from the provider icon key", async () => {
		let requestedKey = "";
		const { app, env } = createApp({
			get: async (key: string) => {
				requestedKey = key;
				return {
					body: new ReadableStream({
						start(controller) {
							controller.enqueue(new TextEncoder().encode("<svg />"));
							controller.close();
						},
					}),
					httpEtag: '"x-v1"',
				} as R2ObjectBody;
			},
		} as unknown as R2Bucket);

		const response = await app.request("/provider-icons/x.svg", {}, env);

		assert.equal(response.status, 200);
		assert.equal(requestedKey, "provider-icons/v1/x.svg");
		assert.equal(
			response.headers.get("cache-control"),
			"public, max-age=31536000, immutable",
		);
		assert.equal(response.headers.get("content-type"), "image/svg+xml");
		assert.equal(response.headers.get("etag"), '"x-v1"');
		assert.equal(await response.text(), "<svg />");
	});

	it("returns 404 without reading R2 for an unknown provider", async () => {
		let reads = 0;
		const { app, env } = createApp({
			get: async () => {
				reads += 1;
				return null;
			},
		} as unknown as R2Bucket);

		const response = await app.request("/provider-icons/unknown.svg", {}, env);

		assert.equal(response.status, 404);
		assert.equal(reads, 0);
	});
});
