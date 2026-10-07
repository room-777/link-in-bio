import {
	type PageProfile,
	pageImageContentTypes,
	type UpdatePageDraft,
} from "@grabbin/api";
import {
	attachPageMedia,
	queuePageMediaDeletion,
} from "@grabbin/application/media-assets";
import {
	assertPageWritable,
	PageServiceError,
} from "@grabbin/application/page-lifecycle";
import type { DatabaseClient } from "@grabbin/db";
import { creemSubscription, pages, user } from "@grabbin/db/schema/index";
import {
	type HandleAvailabilityResponse,
	normalizePageHandle,
} from "@grabbin/page-handle";
import { FREE_PAGE_LIMIT, getPlanAccess, PRO_PAGE_LIMIT } from "@grabbin/plan";
import { and, eq, inArray, sql } from "drizzle-orm";
import { isOwnedPageMediaKey } from "./media.service";
import { checkPageHandle } from "./page-handle.service";

function findPublicPageByHandle(db: DatabaseClient, handle: string) {
	return db.query.pages.findFirst({
		where: eq(pages.handle, handle),
		columns: {
			id: true,
			userId: true,
			handle: true,
			imageKey: true,
			imageSource: true,
			imageCrop: true,
			name: true,
			bio: true,
		},
	});
}

export function getOwnedPage(
	db: DatabaseClient,
	input: { handle: string; userId: string },
) {
	return db.query.pages.findFirst({
		where: and(
			eq(pages.handle, normalizePageHandle(input.handle)),
			eq(pages.userId, input.userId),
		),
		columns: { id: true, handle: true },
	});
}

function getHandleError(availability: HandleAvailabilityResponse) {
	if (availability.reason === "invalid") {
		return new PageServiceError("HANDLE_INVALID");
	}
	if (availability.reason === "reserved") {
		return new PageServiceError("HANDLE_RESERVED");
	}
	return new PageServiceError("HANDLE_TAKEN");
}

function isUniqueViolation(error: unknown) {
	return (
		typeof error === "object" &&
		error !== null &&
		"code" in error &&
		error.code === "23505"
	);
}

async function hasValidOwnedPageImage(input: {
	bucket: R2Bucket;
	key: string;
	userId: string;
	pageId: string;
}) {
	if (
		!isOwnedPageMediaKey({
			key: input.key,
			userId: input.userId,
			pageId: input.pageId,
			scope: "profile",
		})
	) {
		return false;
	}

	const object = await input.bucket.head(input.key);
	const contentType = object?.httpMetadata?.contentType;
	const hasSupportedExtension = /\.(avif|gif|jpe?g|png|webp)$/i.test(input.key);
	const hasValidContentType =
		!contentType ||
		contentType === "application/octet-stream" ||
		pageImageContentTypes.includes(
			contentType as (typeof pageImageContentTypes)[number],
		);
	return Boolean(
		object &&
			object.size <= 5 * 1024 * 1024 &&
			hasSupportedExtension &&
			hasValidContentType,
	);
}

export async function createPage({
	db,
	userId,
	rawHandle,
	proProductIds = [],
}: {
	db: DatabaseClient;
	userId: string;
	rawHandle: string;
	proProductIds?: readonly string[];
}) {
	const availability = await checkPageHandle({ db, rawHandle });
	if (!availability.available) throw getHandleError(availability);
	const handle = availability.handle;

	try {
		return await db.transaction(async (tx) => {
			await tx.execute(
				sql`select id from "user" where id = ${userId} for update`,
			);
			const [ownedPages, subscriptions, currentUser] = await Promise.all([
				tx.query.pages.findMany({
					where: eq(pages.userId, userId),
					columns: { id: true },
				}),
				tx.query.creemSubscription.findMany({
					where: eq(creemSubscription.referenceId, userId),
				}),
				tx.query.user.findFirst({
					where: eq(user.id, userId),
					columns: { primaryPageHandle: true },
				}),
			]);
			const plan = getPlanAccess(
				subscriptions.map((subscription) => ({
					productId: subscription.productId,
					status: subscription.status,
					periodEnd: subscription.periodEnd,
					cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
				})),
				proProductIds,
			);
			const limit = plan.hasAccess ? PRO_PAGE_LIMIT : FREE_PAGE_LIMIT;
			if (ownedPages.length >= limit) {
				throw new PageServiceError("PAGE_LIMIT_REACHED");
			}

			const [page] = await tx
				.insert(pages)
				.values({ id: crypto.randomUUID(), userId, handle })
				.returning();
			if (!page) throw new Error("PAGE_CREATE_FAILED");

			if (!currentUser?.primaryPageHandle) {
				await tx
					.update(user)
					.set({ primaryPageHandle: page.handle })
					.where(eq(user.id, userId));
			}
			return page;
		});
	} catch (error) {
		if (isUniqueViolation(error)) {
			throw new PageServiceError("UNIQUE_CONFLICT");
		}
		throw error;
	}
}

export async function updatePageHandle({
	db,
	userId,
	handle: rawCurrentHandle,
	rawHandle,
	proProductIds = [],
}: {
	db: DatabaseClient;
	userId: string;
	handle: string;
	rawHandle: string;
	proProductIds?: readonly string[];
}) {
	const currentHandle = normalizePageHandle(rawCurrentHandle);
	const existingPage = await db.query.pages.findFirst({
		where: and(eq(pages.handle, currentHandle), eq(pages.userId, userId)),
		columns: { id: true, handle: true },
	});
	if (!existingPage) throw new PageServiceError("PAGE_NOT_FOUND");
	await assertPageWritable({ db, userId, page: existingPage, proProductIds });

	const availability = await checkPageHandle({ db, rawHandle });
	if (!availability.available && availability.handle !== existingPage.handle) {
		throw getHandleError(availability);
	}
	if (availability.handle === existingPage.handle) return existingPage;

	try {
		return await db.transaction(async (tx) => {
			const [page] = await tx
				.update(pages)
				.set({ handle: availability.handle })
				.where(and(eq(pages.id, existingPage.id), eq(pages.userId, userId)))
				.returning();
			if (!page) throw new PageServiceError("PAGE_NOT_FOUND");

			const currentUser = await tx.query.user.findFirst({
				where: eq(user.id, userId),
				columns: { primaryPageHandle: true },
			});
			if (currentUser?.primaryPageHandle === existingPage.handle) {
				await tx
					.update(user)
					.set({ primaryPageHandle: page.handle })
					.where(eq(user.id, userId));
			}

			return page;
		});
	} catch (error) {
		if (isUniqueViolation(error)) {
			throw new PageServiceError("UNIQUE_CONFLICT");
		}
		throw error;
	}
}

export async function completePage({
	db,
	bucket,
	userId,
	handle: rawHandle,
	profile,
	proProductIds = [],
}: {
	db: DatabaseClient;
	bucket: R2Bucket;
	userId: string;
	handle: string;
	profile: PageProfile;
	proProductIds?: readonly string[];
}) {
	const handle = normalizePageHandle(rawHandle);
	const existingPage = await db.query.pages.findFirst({
		where: and(eq(pages.handle, handle), eq(pages.userId, userId)),
		columns: { id: true, imageKey: true, imageSource: true, imageCrop: true },
	});
	if (!existingPage) throw new PageServiceError("PAGE_NOT_FOUND");
	await assertPageWritable({
		db,
		userId,
		page: { ...existingPage, handle },
		proProductIds,
	});

	const imageKey = profile.imageKey?.trim() || null;
	if (
		imageKey &&
		!(await hasValidOwnedPageImage({
			bucket,
			key: imageKey,
			userId,
			pageId: existingPage.id,
		}))
	) {
		throw new PageServiceError("PAGE_IMAGE_INVALID");
	}

	const result = await db.transaction(async (tx) => {
		if (
			imageKey &&
			!(await attachPageMedia({
				tx,
				objectKeys: [imageKey],
				pageId: existingPage.id,
				userId,
			}))
		) {
			throw new PageServiceError("PAGE_IMAGE_INVALID");
		}
		if (existingPage.imageKey && existingPage.imageKey !== imageKey)
			await queuePageMediaDeletion({
				tx,
				objectKeys: [existingPage.imageKey],
				pageId: existingPage.id,
				userId,
			});
		const [page] = await tx
			.update(pages)
			.set({
				imageKey,
				imageSource: imageKey,
				imageCrop: imageKey ? (profile.imageCrop ?? null) : null,
				name: profile.name,
				bio: profile.bio?.trim() || null,
			})
			.where(and(eq(pages.handle, handle), eq(pages.userId, userId)))
			.returning();
		if (!page) throw new PageServiceError("PAGE_NOT_FOUND");
		return page;
	});
	return result;
}

export async function updatePageDraft({
	db,
	bucket,
	userId,
	handle: rawHandle,
	draft,
	proProductIds = [],
}: {
	db: DatabaseClient;
	bucket: R2Bucket;
	userId: string;
	handle: string;
	draft: UpdatePageDraft;
	proProductIds?: readonly string[];
}) {
	const handle = normalizePageHandle(rawHandle);
	const existingPage = await db.query.pages.findFirst({
		where: and(eq(pages.handle, handle), eq(pages.userId, userId)),
		columns: { id: true, imageKey: true, imageSource: true, imageCrop: true },
	});
	if (!existingPage) throw new PageServiceError("PAGE_NOT_FOUND");
	await assertPageWritable({
		db,
		userId,
		page: { ...existingPage, handle },
		proProductIds,
	});

	const imageKey = draft.imageKey?.trim() || null;
	if (
		"imageKey" in draft &&
		imageKey &&
		imageKey !== existingPage.imageKey &&
		!(await hasValidOwnedPageImage({
			bucket,
			key: imageKey,
			userId,
			pageId: existingPage.id,
		}))
	) {
		throw new PageServiceError("PAGE_IMAGE_INVALID");
	}
	if ("imageCrop" in draft && draft.imageCrop && !existingPage.imageKey) {
		throw new PageServiceError("PAGE_IMAGE_INVALID");
	}

	const result = await db.transaction(async (tx) => {
		if (
			"imageKey" in draft &&
			imageKey &&
			!(await attachPageMedia({
				tx,
				objectKeys: [imageKey],
				pageId: existingPage.id,
				userId,
			}))
		) {
			throw new PageServiceError("PAGE_IMAGE_INVALID");
		}
		if (
			"imageKey" in draft &&
			existingPage.imageKey &&
			existingPage.imageKey !== imageKey
		) {
			await queuePageMediaDeletion({
				tx,
				objectKeys: [existingPage.imageKey],
				pageId: existingPage.id,
				userId,
			});
		}
		const values: {
			name?: string | null;
			bio?: string | null;
			imageKey?: string | null;
			imageSource?: string | null;
			imageCrop?: PageProfile["imageCrop"];
		} = {};
		if ("name" in draft) values.name = draft.name?.trim() || null;
		if ("bio" in draft) values.bio = draft.bio?.trim() || null;
		if ("imageKey" in draft) {
			values.imageKey = imageKey;
			values.imageSource = imageKey;
			values.imageCrop = imageKey ? (draft.imageCrop ?? null) : null;
		} else if ("imageCrop" in draft) {
			values.imageCrop = draft.imageCrop;
		}
		const [page] = await tx
			.update(pages)
			.set(values)
			.where(and(eq(pages.handle, handle), eq(pages.userId, userId)))
			.returning();
		if (!page) throw new PageServiceError("PAGE_NOT_FOUND");
		return page;
	});
	return result;
}

export async function getPage(db: DatabaseClient, rawHandle: string) {
	return findPublicPageByHandle(db, normalizePageHandle(rawHandle));
}

export async function getPublicPageWithPlan(
	db: DatabaseClient,
	rawHandle: string,
	proProductIds: readonly string[],
) {
	const rows = await db
		.select({
			page: {
				id: pages.id,
				userId: pages.userId,
				handle: pages.handle,
				imageKey: pages.imageKey,
				imageSource: pages.imageSource,
				imageCrop: pages.imageCrop,
				name: pages.name,
				bio: pages.bio,
			},
			subscription: {
				productId: creemSubscription.productId,
				creemSubscriptionId: creemSubscription.creemSubscriptionId,
				status: creemSubscription.status,
				periodEnd: creemSubscription.periodEnd,
				cancelAtPeriodEnd: creemSubscription.cancelAtPeriodEnd,
			},
		})
		.from(pages)
		.leftJoin(
			creemSubscription,
			and(
				eq(creemSubscription.referenceId, pages.userId),
				inArray(creemSubscription.productId, [...proProductIds]),
			),
		)
		.where(eq(pages.handle, normalizePageHandle(rawHandle)));

	if (rows.length === 0) return null;
	const subscriptions = rows.flatMap(({ subscription }) =>
		subscription?.productId
			? [
					{
						subscriptionId: subscription.creemSubscriptionId,
						productId: subscription.productId,
						status: subscription.status,
						periodEnd: subscription.periodEnd,
						cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
					},
				]
			: [],
	);
	const page = rows[0]?.page;
	if (!page) return null;

	return {
		...page,
		hasProAccess: getPlanAccess(subscriptions, proProductIds).hasAccess,
	};
}

export { assertPageWritable } from "@grabbin/application/page-lifecycle";
