import { type PageProfile, pageImageContentTypes } from "@grabbin/api";
import type { DatabaseClient } from "@grabbin/db";
import { pages, user } from "@grabbin/db/schema/index";
import {
	type HandleAvailabilityResponse,
	normalizePageHandle,
} from "@grabbin/page-handle";
import { and, eq } from "drizzle-orm";

import { PageServiceError } from "../exceptions/page.exception";
import { isOwnedPageImageKey } from "./media.service";
import { checkPageHandle } from "./page-handle.service";

function findPageIdByUserId(db: DatabaseClient, userId: string) {
	return db.query.pages.findFirst({
		where: eq(pages.userId, userId),
		columns: { id: true },
	});
}

function findPublicPageByHandle(db: DatabaseClient, handle: string) {
	return db.query.pages.findFirst({
		where: eq(pages.handle, handle),
		columns: {
			id: true,
			userId: true,
			handle: true,
			onboarding: true,
			imageKey: true,
			name: true,
			bio: true,
		},
	});
}

async function insertPage(
	db: DatabaseClient,
	input: { id: string; userId: string; handle: string },
) {
	return db.transaction(async (tx) => {
		const [page] = await tx
			.insert(pages)
			.values({ ...input, onboarding: false })
			.returning();
		if (!page) throw new Error("PAGE_CREATE_FAILED");

		await tx
			.update(user)
			.set({ primaryPageHandle: page.handle })
			.where(eq(user.id, input.userId));

		return page;
	});
}

function updateOwnedPage(
	db: DatabaseClient,
	input: {
		userId: string;
		handle: string;
		imageKey: string | null;
		name: string;
		bio: string | null;
	},
) {
	return db
		.update(pages)
		.set({
			imageKey: input.imageKey,
			name: input.name,
			bio: input.bio,
			onboarding: true,
		})
		.where(and(eq(pages.handle, input.handle), eq(pages.userId, input.userId)))
		.returning();
}

function updateOwnedPageDraft(
	db: DatabaseClient,
	input: {
		userId: string;
		handle: string;
		name: string;
		bio?: string | null;
		imageKey?: string | null;
	},
) {
	const values: {
		name: string;
		bio?: string | null;
		imageKey?: string | null;
	} = { name: input.name };
	if ("bio" in input) values.bio = input.bio;
	if ("imageKey" in input) values.imageKey = input.imageKey;

	return db
		.update(pages)
		.set(values)
		.where(and(eq(pages.handle, input.handle), eq(pages.userId, input.userId)))
		.returning();
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
		!isOwnedPageImageKey({
			key: input.key,
			userId: input.userId,
			pageId: input.pageId,
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
}: {
	db: DatabaseClient;
	userId: string;
	rawHandle: string;
}) {
	const availability = await checkPageHandle({ db, rawHandle });
	if (!availability.available) throw getHandleError(availability);
	const handle = availability.handle;

	const existingPage = await findPageIdByUserId(db, userId);
	if (existingPage) {
		throw new PageServiceError("PAGE_ALREADY_EXISTS");
	}

	try {
		return await insertPage(db, {
			id: crypto.randomUUID(),
			userId,
			handle,
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
}: {
	db: DatabaseClient;
	userId: string;
	handle: string;
	rawHandle: string;
}) {
	const currentHandle = normalizePageHandle(rawCurrentHandle);
	const existingPage = await db.query.pages.findFirst({
		where: and(eq(pages.handle, currentHandle), eq(pages.userId, userId)),
		columns: { id: true, handle: true },
	});
	if (!existingPage) throw new PageServiceError("PAGE_NOT_FOUND");

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

			await tx
				.update(user)
				.set({ primaryPageHandle: page.handle })
				.where(eq(user.id, userId));

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
}: {
	db: DatabaseClient;
	bucket: R2Bucket;
	userId: string;
	handle: string;
	profile: PageProfile;
}) {
	const handle = normalizePageHandle(rawHandle);
	const existingPage = await db.query.pages.findFirst({
		where: and(eq(pages.handle, handle), eq(pages.userId, userId)),
		columns: { id: true, imageKey: true },
	});
	if (!existingPage) throw new PageServiceError("PAGE_NOT_FOUND");

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

	const [page] = await updateOwnedPage(db, {
		userId,
		handle,
		imageKey,
		name: profile.name,
		bio: profile.bio?.trim() || null,
	});

	if (!page) {
		throw new PageServiceError("PAGE_NOT_FOUND");
	}
	if (existingPage.imageKey && existingPage.imageKey !== imageKey) {
		await bucket.delete(existingPage.imageKey).catch(() => undefined);
	}

	return page;
}

export async function updatePageDraft({
	db,
	bucket,
	userId,
	handle: rawHandle,
	draft,
}: {
	db: DatabaseClient;
	bucket: R2Bucket;
	userId: string;
	handle: string;
	draft: PageProfile;
}) {
	const handle = normalizePageHandle(rawHandle);
	const existingPage = await db.query.pages.findFirst({
		where: and(eq(pages.handle, handle), eq(pages.userId, userId)),
		columns: { id: true, imageKey: true },
	});
	if (!existingPage) throw new PageServiceError("PAGE_NOT_FOUND");

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

	const [page] = await updateOwnedPageDraft(db, {
		userId,
		handle,
		name: draft.name.trim(),
		...("bio" in draft ? { bio: draft.bio?.trim() || null } : {}),
		...("imageKey" in draft ? { imageKey } : {}),
	});
	if (!page) throw new PageServiceError("PAGE_NOT_FOUND");

	if (
		"imageKey" in draft &&
		existingPage.imageKey &&
		existingPage.imageKey !== imageKey
	) {
		await bucket.delete(existingPage.imageKey).catch(() => undefined);
	}

	return page;
}

export async function getPage(db: DatabaseClient, rawHandle: string) {
	return findPublicPageByHandle(db, normalizePageHandle(rawHandle));
}
