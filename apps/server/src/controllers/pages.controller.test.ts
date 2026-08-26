import {
	describe,
	expect,
	it,
} from "bun:test";
import { pagesController } from "@controllers/pages.controller";
import type { AppEnv } from "@core/app-factory";
import { errorHandler } from "@middlewares/error-handler.middleware";
import {
	PRO_MONTHLY_PRODUCT_ID,
	PRO_PAGE_LIMIT,
} from "@grabbin/plan";
import { Hono } from "hono";

type TestUser = {
	id: string;
	name: string;
	email: string;
	primaryPageId: string | null;
};

type TestPage = {
	id: string;
	userId: string;
	handle: string;
	name: string | null;
	bio: string | null;
	image: string | null;
	imageSource?: string | null;
	imageCrop?: {
		x: number;
		y: number;
		width: number;
		height: number;
	} | null;
	role: string | null;
	createdAt: Date;
	updatedAt: Date;
};

const now = new Date(
	"2026-07-26T00:00:00.000Z",
);

function findHandleEqualityValue(
	where: unknown,
): string | null {
	if (
		typeof where !== "object" ||
		where === null
	) {
		return null;
	}

	const maybeSql = where as {
		queryChunks?: unknown[];
	};

	if (
		!Array.isArray(maybeSql.queryChunks)
	) {
		return null;
	}

	for (
		let index = 0;
		index < maybeSql.queryChunks.length;
		index += 1
	) {
		const chunk = maybeSql.queryChunks[
			index
		] as
			| {
					name?: unknown;
					queryChunks?: unknown[];
			  }
			| undefined;

		if (
			chunk &&
			typeof chunk.name === "string" &&
			chunk.name === "handle"
		) {
			const valueChunk = maybeSql
				.queryChunks[index + 2] as
				| {
						value?: unknown;
				  }
				| undefined;

			if (
				typeof valueChunk?.value ===
				"string"
			) {
				return valueChunk.value;
			}
		}

		const nestedHandle =
			findHandleEqualityValue(chunk);
		if (nestedHandle) {
			return nestedHandle;
		}
	}

	return null;
}

function createFakeDb({
	currentUser,
	existingPages = [],
	subscriptions = [],
}: {
	currentUser: TestUser;
	existingPages?: TestPage[];
	subscriptions?: Array<{
		status: string;
		productId: string;
		periodStart: Date | null;
		periodEnd: Date | null;
		cancelAtPeriodEnd: boolean;
	}>;
}) {
	const insertedPages: TestPage[] = [];
	const state = {
		currentUser,
		existingPages,
		insertedPages,
	};

	const findPageById = (id: string) =>
		[
			...state.existingPages,
			...state.insertedPages,
		].find((page) => page.id === id) ??
		null;

	const tx = {
		query: {
			user: {
				findFirst: async () =>
					state.currentUser,
			},
			pages: {
				findFirst: async (options?: {
					where?: unknown;
				}) => {
					const handle =
						findHandleEqualityValue(
							options?.where,
						);

					if (handle) {
						return (
							state.existingPages.find(
								(page) =>
									page.handle ===
									handle,
							) ?? null
						);
					}

					return (
						state.existingPages[0] ??
						null
					);
				},
				findMany: async () => [
					...state.existingPages,
					...state.insertedPages,
				],
			},
			creemSubscription: {
				findMany: async () =>
					subscriptions,
			},
			pageItems: {
				findMany: async () => [],
			},
		},
		insert: () => ({
			values: (
				value: Omit<
					TestPage,
					"createdAt" | "updatedAt"
				>,
			) => ({
				returning: async () => {
					const page = {
						...value,
						createdAt: now,
						updatedAt: now,
					};
					state.insertedPages.push(
						page,
					);
					return [page];
				},
			}),
		}),
		update: () => ({
			set: (value: {
				primaryPageId?: string;
				name?: string | null;
				bio?: string | null;
				image?: string | null;
				updatedAt?: Date;
			}) => ({
				where: () => ({
					returning: async () => {
						if (
							typeof value.primaryPageId !==
							"undefined"
						) {
							if (
								state.currentUser
									.primaryPageId
							) {
								return [];
							}

							state.currentUser.primaryPageId =
								value.primaryPageId ??
								null;
							return [
								{
									id: state.currentUser
										.id,
								},
							];
						}

						if (
							typeof state.currentUser
								.primaryPageId !==
							"string"
						) {
							return [];
						}

						const page = findPageById(
							state.currentUser
								.primaryPageId,
						);

						if (!page) {
							return [];
						}

						page.name =
							typeof value.name ===
							"undefined"
								? page.name
								: value.name;
						page.bio =
							typeof value.bio ===
							"undefined"
								? page.bio
								: value.bio;
						page.image =
							typeof value.image ===
							"undefined"
								? page.image
								: value.image;
						page.updatedAt =
							value.updatedAt ?? now;

						return [
							{
								...page,
							},
						];
					},
				}),
			}),
		}),
		delete: () => ({
			where: async () => undefined,
		}),
	};

	return {
		state,
		db: {
			query: tx.query,
			transaction: async <T>(
				callback: (
					transaction: typeof tx,
				) => Promise<T>,
			) => callback(tx),
		},
	};
}

function createTestApp({
	db,
	user,
}: {
	db: unknown;
	user: TestUser | null;
}) {
	return new Hono<AppEnv>()
		.use("*", async (c, next) => {
			c.set("db", db as never);
			c.set(
				"session",
				user
					? ({
							id: "session_1",
						} as never)
					: null,
			);
			c.set("user", user as never);
			await next();
		})
		.onError(errorHandler)
		.route("/pages", pagesController);
}

describe("pagesController", () => {
	it("returns the signed-in user's primary page at /pages/me", async () => {
		const user = {
			id: "user_1",
			name: "Kim",
			email: "kim@example.com",
			primaryPageId: "page_1",
		};
		const { db } = createFakeDb({
			currentUser: user,
			existingPages: [
				{
					id: "page_1",
					userId: "user_1",
					handle: "kim",
					name: "Kim",
					bio: null,
					image: null,
					role: null,
					createdAt: now,
					updatedAt: now,
				},
			],
		});
		const app = createTestApp({
			db,
			user,
		});

		const response = await app.request(
			"/pages/me",
		);

		expect(response.status).toBe(200);
		const body =
			(await response.json()) as {
				page: TestPage | null;
			};
		expect(body.page).toMatchObject({
			id: "page_1",
			userId: "user_1",
			handle: "kim",
			name: "Kim",
		});
	});

	it("returns null at /pages/me when the signed-in user has no primary page", async () => {
		const user = {
			id: "user_1",
			name: "Kim",
			email: "kim@example.com",
			primaryPageId: null,
		};
		const { db } = createFakeDb({
			currentUser: user,
		});
		const app = createTestApp({
			db,
			user,
		});

		const response = await app.request(
			"/pages/me",
		);

		expect(response.status).toBe(200);
		const body =
			(await response.json()) as unknown;
		expect(body).toEqual({
			page: null,
		});
	});

	it("requires a signed-in user at /pages/me", async () => {
		const user = {
			id: "user_1",
			name: "Kim",
			email: "kim@example.com",
			primaryPageId: null,
		};
		const { db } = createFakeDb({
			currentUser: user,
		});
		const app = createTestApp({
			db,
			user: null,
		});

		const response = await app.request(
			"/pages/me",
		);

		expect(response.status).toBe(401);
	});

	it("reports when the user has reached the page creation limit", async () => {
		const user = {
			id: "user_1",
			name: "Kim",
			email: "kim@example.com",
			primaryPageId: "page_1",
		};
		const page = {
			id: "page_1",
			userId: "user_1",
			handle: "kim",
			name: "Kim",
			bio: null,
			image: null,
			role: null,
			createdAt: now,
			updatedAt: now,
		};
		const { db } = createFakeDb({
			currentUser: user,
			existingPages: Array.from(
				{ length: PRO_PAGE_LIMIT },
				(_, index) => ({
					...page,
					id: `page_${index + 1}`,
					handle:
						index === 0
							? "kim"
							: `page-${index + 1}`,
				}),
			),
			subscriptions: [
				{
					status: "active",
					productId: PRO_MONTHLY_PRODUCT_ID,
					periodStart: now,
					periodEnd: new Date("2026-08-26T00:00:00.000Z"),
					cancelAtPeriodEnd: false,
				},
			],
		});
		const app = createTestApp({ db, user });

		const response = await app.request("/pages");

		expect(response.status).toBe(200);
		expect(await response.json()).toMatchObject({
			canCreatePage: false,
		});
	});

	it("reports reserved handles as unavailable at /pages/check", async () => {
		const user = {
			id: "user_1",
			name: "Kim",
			email: "kim@example.com",
			primaryPageId: null,
		};
		const { db } = createFakeDb({
			currentUser: user,
		});
		const app = createTestApp({
			db,
			user,
		});

		const response = await app.request(
			"/pages/check?handle=new",
		);

		expect(response.status).toBe(200);
		const body =
			(await response.json()) as unknown;
		expect(body).toEqual({
			handle: "new",
			available: false,
			reason: "reserved",
		});
	});

	it("checks handles for users who already have a primary page", async () => {
		const user = {
			id: "user_1",
			name: "Kim",
			email: "kim@example.com",
			primaryPageId: "page_1",
		};
		const { db } = createFakeDb({
			currentUser: user,
		});
		const app = createTestApp({
			db,
			user,
		});

		const response = await app.request(
			"/pages/check?handle=new-handle",
		);

		expect(response.status).toBe(200);
		const body =
			(await response.json()) as unknown;
		expect(body).toEqual({
			handle: "new-handle",
			available: true,
			reason: null,
		});
	});

	it("reports invalid handles as unavailable with the submitted handle", async () => {
		const user = {
			id: "user_1",
			name: "Kim",
			email: "kim@example.com",
			primaryPageId: null,
		};
		const { db } = createFakeDb({
			currentUser: user,
		});
		const app = createTestApp({
			db,
			user,
		});

		const response = await app.request(
			"/pages/check?handle=x",
		);

		expect(response.status).toBe(200);
		const body =
			(await response.json()) as unknown;
		expect(body).toEqual({
			handle: "x",
			available: false,
			reason: "invalid",
		});
	});

	it("reports existing handles as unavailable at /pages/check", async () => {
		const user = {
			id: "user_1",
			name: "Kim",
			email: "kim@example.com",
			primaryPageId: null,
		};
		const { db } = createFakeDb({
			currentUser: user,
			existingPages: [
				{
					id: "page_existing",
					userId: "user_2",
					handle: "taken",
					name: "Taken",
					bio: null,
					image: null,
					role: null,
					createdAt: now,
					updatedAt: now,
				},
			],
		});
		const app = createTestApp({
			db,
			user,
		});

		const response = await app.request(
			"/pages/check?handle=taken",
		);

		expect(response.status).toBe(200);
		const body =
			(await response.json()) as unknown;
		expect(body).toEqual({
			handle: "taken",
			available: false,
			reason: "taken",
		});
	});

	it("returns a page by handle at /pages/:handle without requiring auth", async () => {
		const user = {
			id: "user_1",
			name: "Kim",
			email: "kim@example.com",
			primaryPageId: null,
		};
		const { db } = createFakeDb({
			currentUser: user,
			existingPages: [
				{
					id: "page_1",
					userId: "user_1",
					handle: "kim",
					name: "Kim",
					bio: "Hello",
					image:
						"users/user_1/page_1/profile/avatar-crop.webp",
					imageSource:
						"users/user_1/page_1/profile/avatar.png",
					imageCrop: {
						x: 10,
						y: 10,
						width: 80,
						height: 80,
					},
					role: null,
					createdAt: now,
					updatedAt: now,
				},
			],
		});
		const app = createTestApp({
			db,
			user: null,
		});

		const response = await app.request(
			"/pages/kim",
		);

		expect(response.status).toBe(200);
		const body =
			(await response.json()) as {
				page: TestPage;
			};
		expect(body.page).toMatchObject({
			id: "page_1",
			userId: "user_1",
			handle: "kim",
			name: "Kim",
			bio: "Hello",
			imageSource:
				"users/user_1/page_1/profile/avatar.png",
			imageCrop: {
				x: 10,
				y: 10,
				width: 80,
				height: 80,
			},
		});
	});

	it("returns 404 for an unknown handle at /pages/:handle", async () => {
		const user = {
			id: "user_1",
			name: "Kim",
			email: "kim@example.com",
			primaryPageId: null,
		};
		const { db } = createFakeDb({
			currentUser: user,
			existingPages: [
				{
					id: "page_1",
					userId: "user_1",
					handle: "kim",
					name: "Kim",
					bio: null,
					image: null,
					role: null,
					createdAt: now,
					updatedAt: now,
				},
			],
		});
		const app = createTestApp({
			db,
			user: null,
		});

		const response = await app.request(
			"/pages/unknown",
		);

		expect(response.status).toBe(404);
	});

	it("creates a page and sets the user's primary page", async () => {
		const user = {
			id: "user_1",
			name: "Kim",
			email: "kim@example.com",
			primaryPageId: null,
		};
		const { db, state } = createFakeDb({
			currentUser: user,
		});
		const app = createTestApp({
			db,
			user,
		});
		const scheduled: Promise<unknown>[] = [];
		const executionCtx = {
			waitUntil: (promise: Promise<unknown>) => {
				scheduled.push(promise);
			},
		};
		const originalFetch = globalThis.fetch;
		let sentBody: unknown;
		globalThis.fetch = (async (
			_input: RequestInfo,
			init?: RequestInit,
		) => {
			sentBody = JSON.parse(String(init?.body));
			return new Response(null, { status: 204 });
		}) as unknown as typeof fetch;

		const response = await app.fetch(
			new Request("http://localhost/pages", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Cookie: "grabbin_entry_route=pricing",
				},
				body: JSON.stringify({
					handle: " My-Page ",
					name: "My Page",
					bio: "Hello",
					image: "ignored-image",
					role: "Engineer",
				}),
			}),
			{ FRONTEND_URL: "https://grabbin.me" } as never,
			executionCtx as never,
		);
		await Promise.all(scheduled);
		globalThis.fetch = originalFetch;

		expect(response.status).toBe(201);
		const body =
			(await response.json()) as {
				page: TestPage;
			};
		expect(body.page).toMatchObject({
			userId: "user_1",
			handle: "my-page",
			name: "My Page",
			bio: "Hello",
			image: null,
			role: "Engineer",
		});
		expect(
			state.insertedPages,
		).toHaveLength(1);
		expect(
			state.currentUser.primaryPageId,
		).toBe(body.page.id);
		expect(scheduled).toHaveLength(1);
		expect(sentBody).toMatchObject({
			event: "first_page_created",
			metadata: { entry_route: "pricing" },
		});
	});

	it("creates a secondary page without replacing the primary page", async () => {
		const user = {
			id: "user_1",
			name: "Kim",
			email: "kim@example.com",
			primaryPageId: "page_1",
		};
		const { db, state } = createFakeDb({
			currentUser: user,
			existingPages: [
				{
					id: "page_1",
					userId: "user_1",
					handle: "kim",
					name: "Kim",
					bio: null,
					image: null,
					role: null,
					createdAt: now,
					updatedAt: now,
				},
			],
			subscriptions: [
				{
					status: "active",
					productId: PRO_MONTHLY_PRODUCT_ID,
					periodStart: now,
					periodEnd: new Date("2027-08-26T00:00:00.000Z"),
					cancelAtPeriodEnd: false,
				},
			],
		});
		const app = createTestApp({ db, user });
		const scheduled: Promise<unknown>[] = [];
		const executionCtx = {
			waitUntil: (promise: Promise<unknown>) => {
				scheduled.push(promise);
			},
		};

		const response = await app.fetch(
			new Request("http://localhost/pages", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					handle: "second-page",
					name: null,
					role: null,
				}),
			}),
			{ FRONTEND_URL: "https://grabbin.me" } as never,
			executionCtx as never,
		);

		expect(response.status).toBe(201);
		expect(state.currentUser.primaryPageId).toBe("page_1");
		expect(state.insertedPages).toHaveLength(1);
		expect(scheduled).toHaveLength(0);
	});

	it("deletes a non-primary page without plan access", async () => {
		const user = {
			id: "user_1",
			name: "Kim",
			email: "kim@example.com",
			primaryPageId: "page_primary",
		};
		const { db } = createFakeDb({
			currentUser: user,
			existingPages: [
				{
					id: "page_primary",
					userId: "user_1",
					handle: "kim",
					name: "Kim",
					bio: null,
					image: null,
					role: null,
					createdAt: now,
					updatedAt: now,
				},
				{
					id: "page_secondary",
					userId: "user_1",
					handle: "secondary",
					name: "Secondary",
					bio: null,
					image: null,
					role: null,
					createdAt: now,
					updatedAt: now,
				},
			],
		});
		const app = createTestApp({ db, user });

		const response = await app.fetch(
			new Request("http://localhost/pages/secondary", {
				method: "DELETE",
			}),
			{
				ITEM_MEDIA_DELETE_QUEUE: undefined,
			} as never,
			{
				waitUntil: () => undefined,
			} as never,
		);

		expect(response.status).toBe(204);
	});

	it("patches the signed-in user's page at /pages/:handle", async () => {
		const user = {
			id: "user_1",
			name: "Kim",
			email: "kim@example.com",
			primaryPageId: "page_1",
		};
		const { db, state } = createFakeDb({
			currentUser: user,
			existingPages: [
				{
					id: "page_1",
					userId: "user_1",
					handle: "kim",
					name: "Kim",
					bio: "Hello",
					image: null,
					role: null,
					createdAt: now,
					updatedAt: now,
				},
			],
		});
		const app = createTestApp({
			db,
			user,
		});

		const response = await app.request(
			"/pages/kim",
			{
				method: "PATCH",
				headers: {
					"Content-Type":
						"application/json",
				},
				body: JSON.stringify({
					name: "Kim Updated",
					bio: "",
					image:
						"https://example.com/avatar.png",
				}),
			},
		);

		expect(response.status).toBe(200);
		const body =
			(await response.json()) as {
				page: TestPage;
			};
		expect(body.page).toMatchObject({
			id: "page_1",
			name: "Kim Updated",
			bio: null,
			image:
				"https://example.com/avatar.png",
		});
		expect(
			state.existingPages[0],
		).toMatchObject({
			name: "Kim Updated",
			bio: null,
			image:
				"https://example.com/avatar.png",
		});
	});

	it("persists a null image when patching /pages/:handle", async () => {
		const user = {
			id: "user_1",
			name: "Kim",
			email: "kim@example.com",
			primaryPageId: "page_1",
		};
		const { db, state } = createFakeDb({
			currentUser: user,
			existingPages: [
				{
					id: "page_1",
					userId: "user_1",
					handle: "kim",
					name: "Kim",
					bio: "Hello",
					image: "images/kim.png",
					role: null,
					createdAt: now,
					updatedAt: now,
				},
			],
		});
		const app = createTestApp({
			db,
			user,
		});

		const response = await app.request(
			"/pages/kim",
			{
				method: "PATCH",
				headers: {
					"Content-Type":
						"application/json",
				},
				body: JSON.stringify({
					image: null,
				}),
			},
		);

		expect(response.status).toBe(200);
		expect(
			state.existingPages[0]?.image,
		).toBeNull();
	});

	it("returns 404 when patching /pages/:handle without a page", async () => {
		const user = {
			id: "user_1",
			name: "Kim",
			email: "kim@example.com",
			primaryPageId: null,
		};
		const { db } = createFakeDb({
			currentUser: user,
		});
		const app = createTestApp({
			db,
			user,
		});

		const response = await app.request(
			"/pages/kim",
			{
				method: "PATCH",
				headers: {
					"Content-Type":
						"application/json",
				},
				body: JSON.stringify({
					name: "Kim Updated",
				}),
			},
		);

		expect(response.status).toBe(404);
	});

	it("returns 422 when patching /pages/:handle without fields", async () => {
		const user = {
			id: "user_1",
			name: "Kim",
			email: "kim@example.com",
			primaryPageId: "page_1",
		};
		const { db } = createFakeDb({
			currentUser: user,
			existingPages: [
				{
					id: "page_1",
					userId: "user_1",
					handle: "kim",
					name: "Kim",
					bio: null,
					image: null,
					role: null,
					createdAt: now,
					updatedAt: now,
				},
			],
		});
		const app = createTestApp({
			db,
			user,
		});

		const response = await app.request(
			"/pages/kim",
			{
				method: "PATCH",
				headers: {
					"Content-Type":
						"application/json",
				},
				body: JSON.stringify({}),
			},
		);

		expect(response.status).toBe(422);
	});

	it("allows clearing a page name", async () => {
		const user = {
			id: "user_1",
			name: "Kim",
			email: "kim@example.com",
			primaryPageId: "page_1",
		};
		const { db, state } = createFakeDb({
			currentUser: user,
			existingPages: [
				{
					id: "page_1",
					userId: "user_1",
					handle: "kim",
					name: "Kim",
					bio: null,
					image: null,
					role: null,
					createdAt: now,
					updatedAt: now,
				},
			],
		});
		const app = createTestApp({
			db,
			user,
		});

		const response = await app.request(
			"/pages/kim",
			{
				method: "PATCH",
				headers: {
					"Content-Type":
						"application/json",
				},
				body: JSON.stringify({
					name: "",
				}),
			},
		);

		expect(response.status).toBe(200);
		expect(
			state.existingPages[0]?.name,
		).toBeNull();
		expect(
			(await response.json()) as {
				page: TestPage;
			},
		).toMatchObject({
			page: { name: null },
		});
	});
});
