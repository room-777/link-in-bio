import {
	describe,
	expect,
	it,
} from "bun:test";
import { pageItemsController } from "@controllers/page-items.controller";
import type { AppEnv } from "@core/app-factory";
import type { pageItems } from "@db/schema";
import { errorHandler } from "@middlewares/error-handler.middleware";
import { Hono } from "hono";

const page = {
	id: "page_1",
	userId: "user_1",
	handle: "kim",
};

const defaultLayouts = {
	wide: {
		x: 0,
		y: 0,
		w: 2,
		h: 2,
	},
	compact: {
		x: 0,
		y: 0,
		w: 2,
		h: 2,
	},
} as const;

function createApp(
	user: { id: string } | null = null,
) {
	const app = new Hono<AppEnv>();
	app.use("*", async (c, next) => {
		c.set("user", user as never);
		c.set("db", {
			query: {
				pages: {
					findFirst: async () => page,
				},
				pageItems: {
					findMany: async () => [],
				},
			},
		} as never);
		await next();
	});
	return app
		.onError(errorHandler)
		.route(
			"/pages",
			pageItemsController,
		);
}

function createBatchApp() {
	const items: Array<
		Record<string, unknown>
	> = [];
	const db = {
		query: {
			pages: {
				findFirst: async () => page,
			},
			pageItems: {
				findMany: async () => items,
			},
		},
		transaction: async (
			callback: (
				tx: unknown,
			) => Promise<unknown>,
		) => callback(db),
		insert: () => {
			const builder = {
				values: (
					values:
						| Record<string, unknown>
						| Array<
								Record<string, unknown>
						  >,
				) => {
					for (const value of Array.isArray(
						values,
					)
						? values
						: [values])
						items.push({
							...value,
							createdAt: new Date(
								"2026-07-27T00:00:00.000Z",
							),
							updatedAt: new Date(
								"2026-07-27T00:00:00.000Z",
							),
						});
					return builder;
				},
				onConflictDoUpdate: () =>
					builder,
			};
			return builder;
		},
	};
	const app = new Hono<AppEnv>();
	app.use("*", async (c, next) => {
		c.set("user", {
			id: "user_1",
		} as never);
		c.set("db", db as never);
		await next();
	});
	return {
		app: app
			.onError(errorHandler)
			.route(
				"/pages",
				pageItemsController,
			),
		items,
	};
}

function createMetadataApp(
	url = "mailto:hello@example.com",
) {
	const item: typeof pageItems.$inferSelect =
		{
			id: "link_1",
			pageId: page.id,
			type: "link",
			data: {
				url,
				metadata: {
					title: url.replace(
						"mailto:",
						"",
					),
				},
			},
			style: {},
			layouts: {
				wide: {
					x: 0,
					y: 0,
					w: 2,
					h: 2,
				},
				compact: {
					x: 0,
					y: 0,
					w: 2,
					h: 2,
				},
			},
			createdAt: new Date(
				"2026-07-27T00:00:00.000Z",
			),
			updatedAt: new Date(
				"2026-07-27T00:00:00.000Z",
			),
		};
	const db = {
		query: {
			pages: {
				findFirst: async () => page,
			},
			pageItems: {
				findFirst: async () => item,
			},
		},
		update: () => ({
			set: (
				values: Record<string, unknown>,
			) => ({
				where: async () => {
					Object.assign(item, values);
				},
			}),
		}),
	};
	const app = new Hono<AppEnv>();
	app.use("*", async (c, next) => {
		c.set("user", {
			id: "user_1",
		} as never);
		c.set("db", db as never);
		await next();
	});
	return app
		.onError(errorHandler)
		.route(
			"/pages",
			pageItemsController,
		);
}

describe("pageItemsController", () => {
	it("requires authentication for item upload", async () => {
		const response =
			await createApp().request(
				"/pages/kim/items/upload",
				{ method: "POST", body: "{}" },
			);
		expect(response.status).toBe(401);
	});

	it("rejects path traversal filenames before signing an upload", async () => {
		const response = await createApp({
			id: "user_1",
		}).request(
			"/pages/kim/items/upload",
			{
				method: "POST",
				headers: {
					"content-type":
						"application/json",
				},
				body: JSON.stringify({
					filename: "../secret.png",
					contentType: "image/png",
					size: 10,
				}),
			},
		);
		expect(response.status).toBe(422);
	});

	it("rejects malformed JSON with a client error", async () => {
		const response = await createApp({
			id: "user_1",
		}).request(
			"/pages/kim/items/upload",
			{
				method: "POST",
				headers: {
					"content-type":
						"application/json",
				},
				body: "{",
			},
		);
		expect(response.status).toBe(422);
	});

	it("rejects duplicate and conflicting batch item IDs", async () => {
		const duplicate = await createApp({
			id: "user_1",
		}).request("/pages/kim/batch", {
			method: "PATCH",
			headers: {
				"content-type":
					"application/json",
			},
			body: JSON.stringify({
				upserts: [
					{
						id: "item_1",
						type: "text",
						data: { text: "One" },
						style: {},
						layouts: {
							wide: {
								x: 0,
								y: 0,
								w: 2,
								h: 1,
							},
							compact: {
								x: 0,
								y: 0,
								w: 2,
								h: 1,
							},
						},
					},
					{
						id: "item_1",
						type: "text",
						data: { text: "Two" },
						style: {},
						layouts: {
							wide: {
								x: 0,
								y: 0,
								w: 2,
								h: 1,
							},
							compact: {
								x: 0,
								y: 0,
								w: 2,
								h: 1,
							},
						},
					},
				],
				deletes: [],
			}),
		});
		expect(duplicate.status).toBe(422);

		const conflict = await createApp({
			id: "user_1",
		}).request("/pages/kim/batch", {
			method: "PATCH",
			headers: {
				"content-type":
					"application/json",
			},
			body: JSON.stringify({
				upserts: [
					{
						id: "item_1",
						type: "text",
						data: { text: "One" },
						style: {},
						layouts: {
							wide: {
								x: 0,
								y: 0,
								w: 2,
								h: 1,
							},
							compact: {
								x: 0,
								y: 0,
								w: 2,
								h: 1,
							},
						},
					},
				],
				deletes: ["item_1"],
			}),
		});
		expect(conflict.status).toBe(422);
	});

	it("completes an uploaded media object after checking its metadata", async () => {
		const response = await createApp({
			id: "user_1",
		}).request(
			"/pages/kim/items/upload/complete",
			{
				method: "POST",
				headers: {
					"content-type":
						"application/json",
				},
				body: JSON.stringify({
					objectKey:
						"users/user_1/page_1/photo.png",
				}),
			},
			{
				IMAGES: {
					head: async () => ({
						size: 10,
						httpMetadata: {
							contentType: "image/png",
						},
					}),
				},
			} as never,
		);
		expect(response.status).toBe(200);
		expect(
			await response.json(),
		).toMatchObject({
			objectKey:
				"users/user_1/page_1/photo.png",
			mimeType: "image/png",
			size: 10,
		});
	});

	it("applies multiple new items in one batch", async () => {
		const { app, items } =
			createBatchApp();
		const response = await app.request(
			"/pages/kim/batch",
			{
				method: "PATCH",
				headers: {
					"content-type":
						"application/json",
				},
				body: JSON.stringify({
					upserts: [
						{
							id: "item_1",
							type: "text",
							data: { text: "One" },
							style: {},
							layouts: {
								wide: {
									x: 0,
									y: 0,
									w: 2,
									h: 1,
								},
								compact: {
									x: 0,
									y: 0,
									w: 2,
									h: 1,
								},
							},
						},
						{
							id: "item_2",
							type: "text",
							data: { text: "Two" },
							style: {},
							layouts: {
								wide: {
									x: 2,
									y: 0,
									w: 2,
									h: 1,
								},
								compact: {
									x: 0,
									y: 1,
									w: 2,
									h: 1,
								},
							},
						},
					],
					deletes: [],
				}),
			},
		);
		expect(response.status).toBe(200);
		expect(items).toHaveLength(2);
		expect(
			items.map((item) => item.data),
		).toEqual([
			{ text: "One" },
			{ text: "Two" },
		]);
		expect(
			(
				(await response.json()) as {
					items: unknown[];
				}
			).items,
		).toHaveLength(2);
	});

	it("persists independent wide and compact media crops", async () => {
		const { app, items } =
			createBatchApp();
		const crop = {
			wide: {
				x: 12,
				y: 8,
				width: 60,
				height: 72,
			},
			compact: {
				x: 4,
				y: 20,
				width: 88,
				height: 48,
			},
		};
		const response = await app.request(
			"/pages/kim/batch",
			{
				method: "PATCH",
				headers: {
					"content-type":
						"application/json",
				},
				body: JSON.stringify({
					upserts: [
						{
							id: "media_1",
							type: "media",
							data: {
								objectKey:
									"users/user_1/page_1/media.png",
								mimeType: "image/png",
								crop,
							},
							style: {},
							layouts: defaultLayouts,
						},
					],
					deletes: [],
				}),
			},
		);

		expect(response.status).toBe(200);
		expect(items).toHaveLength(1);
		expect(
			items[0]?.data,
		).toMatchObject({ crop });
		expect(
			(
				(await response.json()) as {
					items: Array<{
						data: { crop: typeof crop };
					}>;
				}
			).items[0]?.data.crop,
		).toEqual(crop);
	});

	it("rejects an out-of-bounds media crop without mutating the item", async () => {
		const { app, items } =
			createBatchApp();
		const validCrop = {
			wide: {
				x: 12,
				y: 8,
				width: 60,
				height: 72,
			},
			compact: {
				x: 4,
				y: 20,
				width: 88,
				height: 48,
			},
		};
		const createResponse =
			await app.request(
				"/pages/kim/batch",
				{
					method: "PATCH",
					headers: {
						"content-type":
							"application/json",
					},
					body: JSON.stringify({
						upserts: [
							{
								id: "media_1",
								type: "media",
								data: {
									objectKey:
										"users/user_1/page_1/media.png",
									mimeType: "image/png",
									crop: validCrop,
								},
								style: {},
								layouts: defaultLayouts,
							},
						],
						deletes: [],
					}),
				},
			);
		expect(createResponse.status).toBe(
			200,
		);
		const beforeInvalidUpdate =
			structuredClone(items[0]?.data);

		const invalidResponse =
			await app.request(
				"/pages/kim/batch",
				{
					method: "PATCH",
					headers: {
						"content-type":
							"application/json",
					},
					body: JSON.stringify({
						upserts: [
							{
								id: "media_1",
								type: "media",
								data: {
									objectKey:
										"users/user_1/page_1/media.png",
									mimeType: "image/png",
									crop: {
										wide: {
											x: 50,
											y: 0,
											width: 60,
											height: 40,
										},
									},
								},
								style: {},
								layouts: defaultLayouts,
							},
						],
						deletes: [],
					}),
				},
			);

		expect(invalidResponse.status).toBe(
			422,
		);
		expect(items).toHaveLength(1);
		expect(items[0]?.data).toEqual(
			beforeInvalidUpdate,
		);
	});

	it("stores deterministic initial metadata for link items", async () => {
		const { app, items } =
			createBatchApp();
		const response = await app.request(
			"/pages/kim/batch",
			{
				method: "PATCH",
				headers: {
					"content-type":
						"application/json",
				},
				body: JSON.stringify({
					upserts: [
						{
							id: "link_1",
							type: "link",
							data: {
								url: "https://example.com/about",
							},
							style: {},
							layouts: {
								wide: {
									x: 0,
									y: 0,
									w: 2,
									h: 2,
								},
								compact: {
									x: 0,
									y: 0,
									w: 2,
									h: 2,
								},
							},
						},
					],
					deletes: [],
				}),
			},
		);

		expect(response.status).toBe(200);
		expect(
			items[0]?.data,
		).toMatchObject({
			url: "https://example.com/about",
			metadata: {
				title: "example.com/about",
				faviconUrl:
					"https://icons.duckduckgo.com/ip3/example.com.ico",
			},
		});
	});

	it("preserves map zoom when a valid map item is created", async () => {
		const { app, items } =
			createBatchApp();
		const response = await app.request(
			"/pages/kim/batch",
			{
				method: "PATCH",
				headers: {
					"content-type":
						"application/json",
				},
				body: JSON.stringify({
					upserts: [
						{
							id: "map_1",
							type: "map",
							data: {
								latitude: 35.6762,
								longitude: 139.6503,
								zoom: 12,
							},
							style: {},
							layouts: defaultLayouts,
						},
					],
					deletes: [],
				}),
			},
		);

		expect(response.status).toBe(200);
		expect(items).toHaveLength(1);
		expect(items[0]?.data).toEqual({
			latitude: 35.6762,
			longitude: 139.6503,
			zoom: 12,
		});
		expect(
			(
				(await response.json()) as {
					items: Array<{
						data: unknown;
					}>;
				}
			).items[0]?.data,
		).toEqual({
			latitude: 35.6762,
			longitude: 139.6503,
			zoom: 12,
		});
	});

	it("rejects map zoom outside the shared schema boundary", async () => {
		const { app, items } =
			createBatchApp();
		const response = await app.request(
			"/pages/kim/batch",
			{
				method: "PATCH",
				headers: {
					"content-type":
						"application/json",
				},
				body: JSON.stringify({
					upserts: [
						{
							id: "map_1",
							type: "map",
							data: {
								latitude: 35.6762,
								longitude: 139.6503,
								zoom: 23,
							},
							style: {},
							layouts: defaultLayouts,
						},
					],
					deletes: [],
				}),
			},
		);

		expect(response.status).toBe(422);
		expect(items).toHaveLength(0);
	});

	it("accepts legacy map payloads without zoom", async () => {
		const { app, items } =
			createBatchApp();
		const response = await app.request(
			"/pages/kim/batch",
			{
				method: "PATCH",
				headers: {
					"content-type":
						"application/json",
				},
				body: JSON.stringify({
					upserts: [
						{
							id: "map_1",
							type: "map",
							data: {
								latitude: 35.6762,
								longitude: 139.6503,
							},
							style: {},
							layouts: defaultLayouts,
						},
					],
					deletes: [],
				}),
			},
		);

		expect(response.status).toBe(200);
		expect(items).toHaveLength(1);
		expect(items[0]?.data).toEqual({
			latitude: 35.6762,
			longitude: 139.6503,
		});
	});

	it("enriches a saved link through the metadata endpoint", async () => {
		const response =
			await createMetadataApp().request(
				"/pages/kim/metadata",
				{
					method: "POST",
					headers: {
						"content-type":
							"application/json",
					},
					body: JSON.stringify({
						itemId: "link_1",
						url: "mailto:hello@example.com",
					}),
				},
			);

		expect(response.status).toBe(200);
		expect(
			await response.json(),
		).toMatchObject({
			item: {
				id: "link_1",
				data: {
					url: "mailto:hello@example.com",
					metadata: {
						title: "hello@example.com",
					},
				},
			},
		});
	});

	it("rejects metadata for a link whose URL changed", async () => {
		const response =
			await createMetadataApp().request(
				"/pages/kim/metadata",
				{
					method: "POST",
					headers: {
						"content-type":
							"application/json",
					},
					body: JSON.stringify({
						itemId: "link_1",
						url: "mailto:other@example.com",
					}),
				},
			);

		expect(response.status).toBe(422);
	});

	it("does not persist empty text or section items in a mixed batch", async () => {
		const { app, items } =
			createBatchApp();
		const response = await app.request(
			"/pages/kim/batch",
			{
				method: "PATCH",
				headers: {
					"content-type":
						"application/json",
				},
				body: JSON.stringify({
					upserts: [
						{
							id: "empty-text",
							type: "text",
							data: { text: "   " },
							style: {},
							layouts: {
								wide: {
									x: 0,
									y: 0,
									w: 2,
									h: 1,
								},
								compact: {
									x: 0,
									y: 0,
									w: 2,
									h: 1,
								},
							},
						},
						{
							id: "empty-section",
							type: "section",
							data: { title: "" },
							style: {},
							layouts: {
								wide: {
									x: 0,
									y: 0,
									w: 4,
									h: 1,
								},
								compact: {
									x: 0,
									y: 0,
									w: 2,
									h: 1,
								},
							},
						},
						{
							id: "filled-text",
							type: "text",
							data: {
								text: "Saved text",
							},
							style: {},
							layouts: {
								wide: {
									x: 0,
									y: 1,
									w: 2,
									h: 1,
								},
								compact: {
									x: 0,
									y: 1,
									w: 2,
									h: 1,
								},
							},
						},
						{
							id: "filled-section",
							type: "section",
							data: {
								title: "Saved section",
							},
							style: {},
							layouts: {
								wide: {
									x: 0,
									y: 0,
									w: 4,
									h: 1,
								},
								compact: {
									x: 0,
									y: 0,
									w: 2,
									h: 1,
								},
							},
						},
					],
					deletes: [],
				}),
			},
		);

		expect(response.status).toBe(200);
		expect(
			items.map((item) => item.id),
		).toEqual([
			"filled-text",
			"filled-section",
		]);
	});
});
