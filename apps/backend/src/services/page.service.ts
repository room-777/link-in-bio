import type { AppEnv } from "@core/app-factory";
import type { AuthUser } from "@core/auth";
import { getPlanAccess } from "@core/billing";
import type { DatabaseClient } from "@db/index";
import {
	pageItems,
	pages,
	user as userTable,
} from "@db/schema";
import {
	type CreatePageRequest,
	pageHandleSchema,
	type UpdatePageRequest,
} from "@grabbin/api";
import { PRO_PAGE_LIMIT } from "@grabbin/plan";
import {
	and,
	eq,
	isNull,
	sql,
} from "drizzle-orm";
import * as v from "valibot";
import {
	isItemMediaKey,
	isProfileImageCropKey,
	isProfileImageKey,
	isProfileImageStagingKey,
} from "../core/r2";
import {
	ConflictError,
	ForbiddenError,
	NotFoundError,
	UnauthorizedError,
	UnprocessableEntityError,
} from "../exceptions/http-exceptions";
import { assertPageWritable } from "./page-lifecycle.service";

const isUniqueHandleViolation = (
	error: unknown,
) => {
	if (
		typeof error !== "object" ||
		error === null
	)
		return false;
	const maybePgError = error as {
		code?: unknown;
		constraint?: unknown;
	};
	return (
		maybePgError.code === "23505" &&
		maybePgError.constraint ===
			"pages_handle_idx"
	);
};

const lockUserRow = async (
	tx: unknown,
	userId: string,
) => {
	const execute = (
		tx as { execute?: unknown }
	).execute;
	if (typeof execute === "function")
		await (
			execute as (
				query: unknown,
			) => Promise<unknown>
		).call(
			tx,
			sql`select id from "user" where id = ${userId} for update`,
		);
};

const deleteProfileImagesBestEffort =
	async ({
		env,
		userId,
		pageId,
		keys,
		protectedKeys,
	}: {
		env: AppEnv["Bindings"];
		userId: string;
		pageId: string;
		keys: Iterable<string>;
		protectedKeys: Iterable<
			string | null | undefined
		>;
	}) => {
		const protectedKeySet = new Set(
			[...protectedKeys].filter(
				(key): key is string =>
					Boolean(key),
			),
		);
		const ownedPrefix = `users/${userId}/${pageId}/profile/`;
		const results =
			await Promise.allSettled(
				[...new Set(keys)]
					.filter(
						(key) =>
							key.startsWith(
								ownedPrefix,
							) &&
							(isProfileImageKey(key) ||
								isProfileImageCropKey(
									key,
								) ||
								isProfileImageStagingKey(
									key,
								)) &&
							!protectedKeySet.has(key),
					)
					.map((key) =>
						env.IMAGES.delete(key),
					),
			);
		for (const result of results) {
			if (
				result.status === "rejected"
			) {
				console.error(
					"[page] R2 profile image cleanup failed",
					result.reason,
				);
			}
		}
	};

export const getPrimaryPage = async ({
	db,
	userId,
	primaryPageId,
}: {
	db: DatabaseClient;
	userId: string;
	primaryPageId: string | null;
}) => {
	if (!primaryPageId) return null;
	return db.query.pages.findFirst({
		where: and(
			eq(pages.id, primaryPageId),
			eq(pages.userId, userId),
		),
	});
};

export const assertOwnedPage = async (
	db: DatabaseClient,
	handle: string,
	userId: string,
) => {
	const parsedHandle = v.safeParse(
		pageHandleSchema,
		handle,
	);
	if (!parsedHandle.success)
		throw new NotFoundError("Page");
	const page =
		await db.query.pages.findFirst({
			where: and(
				eq(
					pages.handle,
					parsedHandle.output,
				),
				eq(pages.userId, userId),
			),
		});
	if (!page)
		throw new NotFoundError("Page");
	return page;
};

export const assertEligibleUser =
	async ({
		db,
		userId,
		sessionPrimaryPageId,
	}: {
		db: DatabaseClient;
		userId: string;
		sessionPrimaryPageId: string | null;
	}) => {
		if (sessionPrimaryPageId)
			throw new ForbiddenError(
				"Primary page already exists.",
				"PRIMARY_PAGE_ALREADY_EXISTS",
			);
		const currentUser =
			await db.query.user.findFirst({
				where: eq(userTable.id, userId),
			});
		if (!currentUser)
			throw new UnauthorizedError();
		if (currentUser.primaryPageId)
			throw new ForbiddenError(
				"Primary page already exists.",
				"PRIMARY_PAGE_ALREADY_EXISTS",
			);
		return currentUser;
	};

export const canCreatePage = ({
	primaryPageId,
	hasAccess,
	pageCount,
}: {
	primaryPageId: string | null;
	hasAccess: boolean;
	pageCount: number;
}) =>
	!primaryPageId ||
	(hasAccess && pageCount < PRO_PAGE_LIMIT);

export const assertPageCreationAllowed =
	async ({
		db,
		userId,
	}: {
		db: DatabaseClient;
		userId: string;
	}) => {
		const currentUser =
			await db.query.user.findFirst({
				where: eq(userTable.id, userId),
				columns: {
					id: true,
					primaryPageId: true,
				},
			});
		if (!currentUser)
			throw new UnauthorizedError();
		if (!currentUser.primaryPageId)
			return currentUser;

		const pageQuery = (
			db.query as unknown as {
				pages?: {
					findMany?: (
						config: unknown,
					) => Promise<unknown[]>;
				};
			}
		).pages;
		const ownedPages =
			typeof pageQuery?.findMany ===
			"function"
				? await pageQuery.findMany({
						where: eq(
							pages.userId,
							userId,
						),
						columns: { id: true },
					})
				: [];
		const access = await getPlanAccess({
			db,
			userId,
		});
		if (
			canCreatePage({
				primaryPageId:
					currentUser.primaryPageId,
				hasAccess: access.hasAccess,
				pageCount: ownedPages.length,
			})
		)
			return currentUser;
		throw new ForbiddenError(
			"Your plan allows no more pages.",
			"PAGE_LIMIT_REACHED",
		);
	};

export const listOwnedPages = async ({
	db,
	userId,
}: {
	db: DatabaseClient;
	userId: string;
}) => {
	const currentUser =
		await db.query.user.findFirst({
			where: eq(userTable.id, userId),
			columns: { primaryPageId: true },
		});
	if (!currentUser)
		throw new UnauthorizedError();
	return {
		primaryPageId:
			currentUser.primaryPageId,
		pages:
			await db.query.pages.findMany({
				where: eq(pages.userId, userId),
				orderBy: (page, { asc }) => [
					asc(page.createdAt),
					asc(page.id),
				],
			}),
	};
};

export const changePrimaryPage =
	async ({
		db,
		userId,
		handle,
	}: {
		db: DatabaseClient;
		userId: string;
		handle: string;
	}) =>
		db.transaction(async (tx) => {
			await lockUserRow(tx, userId);
			const currentUser =
				await tx.query.user.findFirst({
					where: eq(
						userTable.id,
						userId,
					),
				});
			if (!currentUser)
				throw new UnauthorizedError();
			const access =
				await getPlanAccess({
					db: tx as unknown as DatabaseClient,
					userId,
				});
			if (!access.hasAccess)
				throw new ForbiddenError(
					"Only Pro users can change the primary page.",
					"PRIMARY_CHANGE_FORBIDDEN",
				);
			const target =
				await tx.query.pages.findFirst({
					where: and(
						eq(pages.userId, userId),
						eq(pages.handle, handle),
					),
				});
			if (!target)
				throw new NotFoundError("Page");
			if (
				target.id ===
				currentUser.primaryPageId
			)
				return;

			const previousPrimary =
				currentUser.primaryPageId
					? await tx.query.pages.findFirst(
							{
								where: and(
									eq(
										pages.userId,
										userId,
									),
									eq(
										pages.id,
										currentUser.primaryPageId,
									),
								),
							},
						)
					: null;
			await tx
				.update(userTable)
				.set({
					primaryPageId: target.id,
					updatedAt: new Date(),
				})
				.where(
					eq(userTable.id, userId),
				);
			await tx
				.update(pages)
				.set({
					deletionScheduledAt: null,
				})
				.where(eq(pages.id, target.id));
			if (previousPrimary)
				await tx
					.update(pages)
					.set({
						deletionScheduledAt:
							target.deletionScheduledAt ??
							previousPrimary.deletionScheduledAt,
					})
					.where(
						eq(
							pages.id,
							previousPrimary.id,
						),
					);
		});

export const deleteOwnedPage = async ({
	env,
	db,
	userId,
	handle,
	queue,
	executionCtx,
}: {
	env: AppEnv["Bindings"];
	db: DatabaseClient;
	userId: string;
	handle: string;
	queue?: Queue;
	executionCtx?: Pick<
		ExecutionContext<unknown>,
		"waitUntil"
	>;
}) => {
	const objectKeys =
		await db.transaction(async (tx) => {
			await lockUserRow(tx, userId);
			const currentUser =
				await tx.query.user.findFirst({
					where: eq(
						userTable.id,
						userId,
					),
				});
			if (!currentUser)
				throw new UnauthorizedError();
			const page =
				await tx.query.pages.findFirst({
					where: and(
						eq(pages.userId, userId),
						eq(pages.handle, handle),
					),
				});
			if (!page)
				throw new NotFoundError("Page");
			if (
				page.id ===
				currentUser.primaryPageId
			)
				throw new ForbiddenError(
					"The primary page cannot be deleted.",
					"PRIMARY_PAGE_DELETE_FORBIDDEN",
				);
			const items =
				await tx.query.pageItems.findMany(
					{
						where: eq(
							pageItems.pageId,
							page.id,
						),
						columns: {
							type: true,
							data: true,
						},
					},
				);
			const keys = [
				page.image,
				page.imageSource,
			];
			for (const item of items) {
				const key = (
					item.data as {
						objectKey?: unknown;
					}
				).objectKey;
				if (
					item.type === "media" &&
					typeof key === "string"
				)
					keys.push(key);
			}
			await tx
				.delete(pages)
				.where(eq(pages.id, page.id));
			return [...new Set(keys)].filter(
				(key): key is string =>
					typeof key === "string" &&
					key.startsWith(
						`users/${userId}/${page.id}/`,
					) &&
					(isItemMediaKey(key) ||
						isProfileImageKey(key) ||
						isProfileImageCropKey(
							key,
						) ||
						isProfileImageStagingKey(
							key,
						)),
			);
		});

	if (queue && objectKeys.length) {
		const enqueue = queue
			.sendBatch(
				objectKeys.map((objectKey) => ({
					body: { objectKey },
				})),
			)
			.catch((error) =>
				console.error(
					"[page] asset cleanup enqueue failed",
					error,
				),
			);
		if (executionCtx)
			executionCtx.waitUntil(enqueue);
		else await enqueue;
	}
	void env;
};

export const updatePage = async ({
	env,
	db,
	userId,
	handle,
	input,
}: {
	env: AppEnv["Bindings"];
	db: DatabaseClient;
	userId: string;
	handle: string;
	input: UpdatePageRequest;
}) => {
	const hasProfileMetadataUpdate =
		input.imageSource !== undefined ||
		input.imageCrop !== undefined;
	const isImageClear =
		input.image === null &&
		input.imageSource === null &&
		input.imageCrop === null;
	const isCropOnlyUpdate =
		input.image === undefined &&
		input.imageSource === undefined &&
		input.imageCrop !== undefined;
	if (
		hasProfileMetadataUpdate &&
		!isImageClear &&
		!isCropOnlyUpdate
	) {
		throw new UnprocessableEntityError(
			"Profile image metadata must be updated through image completion.",
			"INVALID_PROFILE_IMAGE",
		);
	}

	try {
		const result = await db.transaction(
			async (tx) => {
				const currentUser =
					await tx.query.user.findFirst(
						{
							where: eq(
								userTable.id,
								userId,
							),
						},
					);
				if (!currentUser)
					throw new NotFoundError(
						"Page",
					);
				const existingPage =
					await tx.query.pages.findFirst(
						{
							where: and(
								eq(
									pages.handle,
									handle,
								),
								eq(
									pages.userId,
									currentUser.id,
								),
							),
						},
					);
				if (!existingPage)
					throw new NotFoundError(
						"Page",
					);
				await assertPageWritable({
					db: tx as unknown as DatabaseClient,
					userId,
					page: existingPage,
				});
				if (
					isCropOnlyUpdate &&
					!existingPage.image &&
					!existingPage.imageSource
				) {
					throw new UnprocessableEntityError(
						"A profile image is required before updating its crop.",
						"INVALID_PROFILE_IMAGE",
					);
				}
				const [page] = await tx
					.update(pages)
					.set({
						handle:
							input.handle ??
							existingPage.handle,
						name:
							input.name === undefined
								? existingPage.name
								: input.name,
						bio:
							input.bio === undefined
								? existingPage.bio
								: input.bio,
						image:
							input.image === undefined
								? existingPage.image
								: input.image,
						imageSource:
							input.image === null
								? null
								: input.imageSource ===
										undefined
									? existingPage.imageSource
									: input.imageSource,
						imageCrop:
							input.image === null
								? null
								: input.imageCrop ===
										undefined
									? existingPage.imageCrop
									: input.imageCrop,
						updatedAt: new Date(),
					})
					.where(
						and(
							eq(
								pages.id,
								existingPage.id,
							),
							eq(
								pages.userId,
								currentUser.id,
							),
						),
					)
					.returning();
				if (!page)
					throw new NotFoundError(
						"Page",
					);
				return {
					page,
					previousImage:
						existingPage.image,
					previousImageSource:
						existingPage.imageSource,
				};
			},
		);
		await deleteProfileImagesBestEffort(
			{
				env,
				userId,
				pageId: result.page.id,
				keys: [
					result.previousImage,
					result.previousImageSource,
				].filter((key): key is string =>
					Boolean(key),
				),
				protectedKeys: [
					result.page.image,
					result.page.imageSource,
				],
			},
		);
		return result.page;
	} catch (error) {
		if (isUniqueHandleViolation(error))
			throw new ConflictError(
				"Handle is already taken.",
				"HANDLE_TAKEN",
			);
		throw error;
	}
};

export const createPage = async ({
	db,
	user,
	input,
}: {
	db: DatabaseClient;
	user: Pick<AuthUser, "id">;
	input: CreatePageRequest;
}) => {
	try {
		return await db.transaction(
			async (tx) => {
				await lockUserRow(tx, user.id);
				const currentUser = await assertPageCreationAllowed(
					{
						db: tx as unknown as DatabaseClient,
						userId: user.id,
					},
				);
				const existingPage =
					await tx.query.pages.findFirst(
						{
							where: eq(
								pages.handle,
								input.handle,
							),
						},
					);
				if (existingPage)
					throw new ConflictError(
						"Handle is already taken.",
						"HANDLE_TAKEN",
					);
				const [page] = await tx
					.insert(pages)
					.values({
						id: crypto.randomUUID(),
						userId: user.id,
						handle: input.handle,
						name: input.name,
						bio: input.bio ?? null,
						image: null,
						role: input.role ?? null,
					})
					.returning();
				if (!currentUser.primaryPageId) {
					const [updatedUser] = await tx
						.update(userTable)
						.set({
							primaryPageId: page.id,
							updatedAt: new Date(),
						})
						.where(
							and(
								eq(userTable.id, user.id),
								isNull(
									userTable.primaryPageId,
								),
							),
						)
						.returning({
							id: userTable.id,
						});
					if (!updatedUser)
						throw new ForbiddenError(
							"Primary page already exists.",
							"PRIMARY_PAGE_ALREADY_EXISTS",
						);
				}
				return page;
			},
		);
	} catch (error) {
		if (isUniqueHandleViolation(error))
			throw new ConflictError(
				"Handle is already taken.",
				"HANDLE_TAKEN",
			);
		throw error;
	}
};
