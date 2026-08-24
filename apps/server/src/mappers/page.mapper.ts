import type { pages } from "@db/schema";
import type {
	OwnedPageSummary,
	PageResponse,
} from "@grabbin/api";

export const mapPageResponse = (
	page: typeof pages.$inferSelect,
): PageResponse => ({
	id: page.id,
	userId: page.userId,
	handle: page.handle,
	name: page.name,
	bio: page.bio,
	image: page.image,
	imageSource: page.imageSource ?? null,
	imageCrop: page.imageCrop ?? null,
	role: page.role,
	createdAt:
		page.createdAt.toISOString(),
	updatedAt:
		page.updatedAt.toISOString(),
});

export const mapPublicPageResponse = (
	page: typeof pages.$inferSelect,
): PageResponse =>
	mapPageResponse(page);

export const mapOwnedPageSummary = (
	page: typeof pages.$inferSelect,
	primaryPageId: string | null,
): OwnedPageSummary => ({
	id: page.id,
	handle: page.handle,
	name: page.name,
	image: page.image ?? null,
	isPrimary: page.id === primaryPageId,
	deletionScheduledAt:
		page.deletionScheduledAt?.toISOString() ??
		null,
	createdAt:
		page.createdAt.toISOString(),
	updatedAt:
		page.updatedAt.toISOString(),
});
