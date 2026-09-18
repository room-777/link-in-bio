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
			image: true,
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
			.set({ primaryPageId: page.id })
			.where(eq(user.id, input.userId));

		return page;
	});
}

function updateOwnedPage(
	db: DatabaseClient,
	input: {
		userId: string;
		handle: string;
		image: string | null;
		name: string;
		bio: string | null;
	},
) {
	return db
		.update(pages)
		.set({
			image: input.image,
			name: input.name,
			bio: input.bio,
			onboarding: true,
		})
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
	return Boolean(
		object &&
			object.size <= 5 * 1024 * 1024 &&
			pageImageContentTypes.includes(
				contentType as (typeof pageImageContentTypes)[number],
			),
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
		columns: { id: true, image: true },
	});
	if (!existingPage) throw new PageServiceError("PAGE_NOT_FOUND");

	const image = profile.image?.trim() || null;
	if (
		image &&
		!(await hasValidOwnedPageImage({
			bucket,
			key: image,
			userId,
			pageId: existingPage.id,
		}))
	) {
		throw new PageServiceError("PAGE_IMAGE_INVALID");
	}

	const [page] = await updateOwnedPage(db, {
		userId,
		handle,
		image,
		name: profile.name,
		bio: profile.bio?.trim() || null,
	});

	if (!page) {
		throw new PageServiceError("PAGE_NOT_FOUND");
	}
	if (existingPage.image && existingPage.image !== image) {
		await bucket.delete(existingPage.image).catch(() => undefined);
	}

	return page;
}

export async function getPage(db: DatabaseClient, rawHandle: string) {
	return findPublicPageByHandle(db, normalizePageHandle(rawHandle));
}
