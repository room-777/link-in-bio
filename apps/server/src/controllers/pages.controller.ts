import type { AppEnv } from "@core/app-factory";
import { getPlanAccess } from "@core/billing";
import {
	type CreatePageResponse,
	createPageRequestSchema,
	createPageResponseSchema,
	isReservedPageHandle,
	type MyPageResponse,
	myPageResponseSchema,
	ownedPageListResponseSchema,
	pageByHandleResponseSchema,
	pageHandleSchema,
	profileImageCompleteRequestSchema,
	profileImageCompleteResponseSchema,
	profileImageUploadRequestSchema,
	profileImageUploadResponseSchema,
	type UpdatePageResponse,
	updatePageRequestSchema,
	updatePageResponseSchema,
} from "@grabbin/api";
import type {
	Context,
	MiddlewareHandler,
} from "hono";
import { Hono } from "hono";
import * as v from "valibot";
import {
	NotFoundError,
	UnauthorizedError,
	UnprocessableEntityError,
} from "../exceptions/http-exceptions";
import {
	mapOwnedPageSummary,
	mapPageResponse,
} from "../mappers/page.mapper";
import { jsonBody } from "../middlewares/json-body.middleware";
import {
	assertPageCreationAllowed,
	canCreatePage,
	changePrimaryPage,
	createPage,
	deleteOwnedPage,
	getPrimaryPage,
	listOwnedPages,
	updatePage,
} from "../services/page.service";
import { checkPageHandle } from "../services/page-handle.service";
import { reconcileUserPageLifecycle } from "../services/page-lifecycle.service";
import {
	completeProfileImageUpload,
	createProfileImageUpload,
} from "../services/profile-image.service";
import {
	getPublicPage,
	listPublicPageHandles,
} from "../services/public-page.service";
import {
	getEntryRouteFromHeader,
	trackSimpleAnalyticsEvent,
} from "../services/simple-analytics.service";

const getPrimaryPageId = (
	user: unknown,
) => {
	if (
		typeof user !== "object" ||
		user === null
	)
		return null;
	const primaryPageId = (
		user as { primaryPageId?: unknown }
	).primaryPageId;
	return typeof primaryPageId ===
		"string"
		? primaryPageId
		: null;
};

const requireUser = (
	c: Context<AppEnv>,
) => {
	const user = c.get("user");
	if (!user)
		throw new UnauthorizedError();
	return user;
};

const requireUserBeforeJson: MiddlewareHandler<
	AppEnv
> = async (c, next) => {
	requireUser(c);
	await next();
};

const parseHandle = (
	handle: string,
) => {
	const parsed = v.safeParse(
		pageHandleSchema,
		handle,
	);
	if (!parsed.success)
		throw new NotFoundError("Page");
	return parsed.output;
};

export const pagesController =
	new Hono<AppEnv>()
		.get("/me", async (c) => {
			const user = requireUser(c);
			const page = await getPrimaryPage(
				{
					db: c.get("db"),
					userId: user.id,
					primaryPageId:
						getPrimaryPageId(user),
				},
			);
			const response = v.parse(
				myPageResponseSchema,
				{
					page: page
						? mapPageResponse(page)
						: null,
				},
			) satisfies MyPageResponse;
			return c.json(response);
		})
		.get("/", async (c) => {
			const user = requireUser(c);
			await reconcileUserPageLifecycle({
				db: c.get("db"),
				userId: user.id,
			});
			const [
				{ pages, primaryPageId },
				access,
			] = await Promise.all([
				listOwnedPages({
					db: c.get("db"),
					userId: user.id,
				}),
				getPlanAccess({
					db: c.get("db"),
					userId: user.id,
				}),
			]);
			return c.json(
				v.parse(
					ownedPageListResponseSchema,
					{
						hasAccess: access.hasAccess,
						canCreatePage:
							canCreatePage({
								primaryPageId,
								hasAccess:
									access.hasAccess,
								pageCount: pages.length,
							}),
						pages: pages.map((page) =>
							mapOwnedPageSummary(
								page,
								primaryPageId,
							),
						),
					},
				),
			);
		})
		.get("/_sitemap", async (c) =>
			c.json(
				await listPublicPageHandles({
					db: c.get("db"),
				}),
				200,
				{
					"Cache-Control":
						"public, max-age=0, s-maxage=3600",
				},
			),
		)
		.patch(
			"/:handle/primary",
			async (c) => {
				const user = requireUser(c);
				await changePrimaryPage({
					db: c.get("db"),
					userId: user.id,
					handle: parseHandle(
						c.req.param("handle"),
					),
				});
				return c.body(null, 204);
			},
		)
		.delete("/:handle", async (c) => {
			const user = requireUser(c);
			await deleteOwnedPage({
				env: c.env,
				db: c.get("db"),
				userId: user.id,
				handle: parseHandle(
					c.req.param("handle"),
				),
				queue:
					c.env.ITEM_MEDIA_DELETE_QUEUE,
				executionCtx: c.executionCtx,
			});
			return c.body(null, 204);
		})
		.patch(
			"/:handle",
			requireUserBeforeJson,
			jsonBody(
				updatePageRequestSchema,
				"Invalid page payload.",
				"INVALID_PAGE_PAYLOAD",
			),
			async (c) => {
				const user = requireUser(c);
				const handle = parseHandle(
					c.req.param("handle"),
				);
				const parsed =
					c.req.valid("json");
				const hasAnyField = [
					parsed.handle,
					parsed.name,
					parsed.bio,
					parsed.image,
					parsed.imageSource,
					parsed.imageCrop,
				].some(
					(field) =>
						field !== undefined,
				);
				if (!hasAnyField)
					throw new UnprocessableEntityError(
						"At least one page field is required.",
						"INVALID_PAGE_PAYLOAD",
					);
				const page = await updatePage({
					env: c.env,
					db: c.get("db"),
					userId: user.id,
					handle,
					input: parsed,
				});
				const response = v.parse(
					updatePageResponseSchema,
					{
						page: mapPageResponse(page),
					},
				) satisfies UpdatePageResponse;
				return c.json(response);
			},
		)
		.get("/check", async (c) => {
			requireUser(c);
			return c.json(
				await checkPageHandle({
					db: c.get("db"),
					rawHandle:
						c.req.query("handle") ?? "",
				}),
			);
		})
		.post(
			"/:handle/image-upload",
			requireUserBeforeJson,
			jsonBody(
				profileImageUploadRequestSchema,
				"Invalid profile image.",
				"INVALID_PROFILE_IMAGE",
			),
			async (c) => {
				const user = requireUser(c);
				const handle = parseHandle(
					c.req.param("handle"),
				);
				const parsed =
					c.req.valid("json");
				const response = v.parse(
					profileImageUploadResponseSchema,
					await createProfileImageUpload(
						{
							env: c.env,
							db: c.get("db"),
							handle,
							userId: user.id,
							input: parsed,
						},
					),
				);
				return c.json(response);
			},
		)
		.post(
			"/:handle/image-upload/complete",
			requireUserBeforeJson,
			jsonBody(
				profileImageCompleteRequestSchema,
				"Invalid profile image key.",
				"INVALID_PROFILE_IMAGE",
			),
			async (c) => {
				const user = requireUser(c);
				const handle = parseHandle(
					c.req.param("handle"),
				);
				const parsed =
					c.req.valid("json");
				const page =
					await completeProfileImageUpload(
						{
							env: c.env,
							db: c.get("db"),
							handle,
							userId: user.id,
							input: parsed,
						},
					);
				const response = v.parse(
					profileImageCompleteResponseSchema,
					{
						page: mapPageResponse(page),
					},
				);
				return c.json(response);
			},
		)
		.get("/:handle", async (c) => {
			const response =
				await getPublicPage({
					db: c.get("db"),
					handle: c.req.param("handle"),
					publicBaseUrl:
						c.env?.R2_PUBLIC_URL,
					viewerUserId:
						c.get("user")?.id ?? null,
				});
			const result = c.json(
				v.parse(
					pageByHandleResponseSchema,
					response,
				),
			);
			result.headers.set(
				"cache-control",
				"no-store",
			);
			return result;
		})
		.post(
			"/",
			requireUserBeforeJson,
			jsonBody(
				createPageRequestSchema,
				"Invalid page payload.",
				"INVALID_PAGE_PAYLOAD",
			),
			async (c) => {
				const sessionUser =
					requireUser(c);
				const currentUser =
					await assertPageCreationAllowed({
						db: c.get("db"),
						userId: sessionUser.id,
					});
				const isFirstPage =
					currentUser.primaryPageId === null;
				const parsed = c.req.valid("json");
				if (
					isReservedPageHandle(parsed.handle)
				)
					throw new UnprocessableEntityError(
						"Reserved handle.",
						"RESERVED_HANDLE",
					);
				const page = await createPage({
					db: c.get("db"),
					user: currentUser,
					input: parsed,
				});
				const response = v.parse(
					createPageResponseSchema,
					{
						page: mapPageResponse(page),
					},
				) satisfies CreatePageResponse;
				if (isFirstPage) {
					c.executionCtx.waitUntil(
						trackSimpleAnalyticsEvent({
							env: c.env,
							event: "first_page_created",
							request: c.req.raw,
							entryRoute:
								getEntryRouteFromHeader(
									c.req.header("X-Entry-Route"),
								),
						}),
					);
				}
				return c.json(response, 201);
			},
		);
