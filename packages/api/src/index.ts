import * as v from "valibot";

import * as grid from "./grid";

export const reservedPageHandles = [
	"admin",
	"api",
	"auth",
	"check",
	"demo",
	"explore",
	"favicon",
	"health",
	"llms",
	"log-in",
	"login",
	"manifest",
	"new",
	"pages",
	"privacy",
	"robots",
	"settings",
	"sitemap",
	"terms",
	"update",
] as const;

const reservedPageHandleSet = new Set<string>(reservedPageHandles);

export const normalizePageHandle = (handle: string) =>
	handle.trim().toLowerCase();

export const isReservedPageHandle = (handle: string) =>
	reservedPageHandleSet.has(normalizePageHandle(handle));

export const pageHandleSchema = v.pipe(
	v.string(),
	v.trim(),
	v.toLowerCase(),
	v.minLength(3, "Handle must be at least 3 characters."),
	v.maxLength(30, "Handle must be at most 30 characters."),
	v.regex(
		/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/,
		"Handle can only include lowercase letters, numbers, and hyphens.",
	),
	v.check(
		(handle) => !handle.includes("--"),
		"Handle cannot include consecutive hyphens.",
	),
);

const optionalTextSchema = v.optional(v.pipe(v.string(), v.trim()));
const nullableTrimmedNameSchema = v.pipe(
	v.string(),
	v.trim(),
	v.maxLength(80, "Name must be at most 80 characters."),
	v.transform((value) => (value.length === 0 ? null : value)),
);
const nullableTrimmedBioSchema = v.pipe(
	v.string(),
	v.trim(),
	v.maxLength(500, "Text must be at most 500 characters."),
	v.transform((value) => (value.length === 0 ? null : value)),
);
const nullableTrimmedImageSchema = v.pipe(
	v.string(),
	v.trim(),
	v.transform((value) => (value.length === 0 ? null : value)),
);

export const profileImageCropSchema = grid.normalizedCropSchema;

export type ProfileImageCrop = grid.NormalizedCrop;

export const profileImageStateSchema = v.object({
	image: v.nullable(v.string()),
	imageSource: v.nullable(v.string()),
	imageCrop: v.nullable(profileImageCropSchema),
});

export type ProfileImageState = v.InferOutput<typeof profileImageStateSchema>;

/**
 * Public HTTP response contracts shared by the backend and its consumers.
 * Keep implementation details such as auth, database, and Cloudflare bindings
 * out of this package.
 */
export const healthResponseSchema = v.object({
	status: v.literal("ok"),
	timestamp: v.string(),
});

export type HealthResponse = v.InferOutput<typeof healthResponseSchema>;

export const sessionEntitlementsSchema = v.object({
	tier: v.picklist(["free", "pro"]),
	hasAccess: v.boolean(),
});

export type SessionEntitlements = v.InferOutput<
	typeof sessionEntitlementsSchema
>;

export const sessionUserSchema = v.object({
	id: v.string(),
	primaryPageId: v.optional(v.nullable(v.string())),
});

export type SessionUser = v.InferOutput<typeof sessionUserSchema>;

export const sessionResponseSchema = v.nullable(
	v.object({
		session: v.unknown(),
		user: sessionUserSchema,
		entitlements: sessionEntitlementsSchema,
	}),
);

export type SessionResponse = v.InferOutput<typeof sessionResponseSchema>;

export const createPageRequestSchema = v.object({
	handle: pageHandleSchema,
	name: v.nullable(nullableTrimmedNameSchema),
	bio: v.optional(
		v.pipe(
			v.string(),
			v.trim(),
			v.maxLength(500, "Bio must be at most 500 characters."),
		),
	),
	image: optionalTextSchema,
	role: v.optional(
		v.nullable(
			v.pipe(
				v.string(),
				v.trim(),
				v.maxLength(80, "Role must be at most 80 characters."),
			),
		),
	),
});

export type CreatePageRequest = v.InferOutput<typeof createPageRequestSchema>;

export const updatePageRequestSchema = v.object({
	handle: v.optional(pageHandleSchema),
	name: v.optional(v.nullable(nullableTrimmedNameSchema)),
	bio: v.optional(nullableTrimmedBioSchema),
	image: v.optional(v.nullable(nullableTrimmedImageSchema)),
	imageSource: v.optional(v.nullable(v.pipe(v.string(), v.trim()))),
	imageCrop: v.optional(v.nullable(profileImageCropSchema)),
});

export type UpdatePageRequest = v.InferOutput<typeof updatePageRequestSchema>;

export const pageResponseSchema = v.object({
	id: v.string(),
	userId: v.string(),
	handle: pageHandleSchema,
	name: v.nullable(v.string()),
	bio: v.nullable(v.string()),
	image: v.nullable(v.string()),
	imageSource: v.nullable(v.string()),
	imageCrop: v.nullable(profileImageCropSchema),
	role: v.nullable(v.string()),
	createdAt: v.string(),
	updatedAt: v.string(),
});

export type PageResponse = v.InferOutput<typeof pageResponseSchema>;

export const ownedPageSummarySchema = v.object({
	id: v.string(),
	handle: pageHandleSchema,
	name: v.nullable(v.string()),
	image: v.nullable(v.string()),
	isPrimary: v.boolean(),
	deletionScheduledAt: v.nullable(v.string()),
	createdAt: v.string(),
	updatedAt: v.string(),
});

export type OwnedPageSummary = v.InferOutput<typeof ownedPageSummarySchema>;

export const ownedPageListResponseSchema = v.object({
	hasAccess: v.boolean(),
	canCreatePage: v.boolean(),
	pages: v.array(ownedPageSummarySchema),
});

export type OwnedPageListResponse = v.InferOutput<
	typeof ownedPageListResponseSchema
>;

export const createPageResponseSchema = v.object({
	page: pageResponseSchema,
});

export type CreatePageResponse = v.InferOutput<typeof createPageResponseSchema>;

export const updatePageResponseSchema = v.object({
	page: pageResponseSchema,
});

export type UpdatePageResponse = v.InferOutput<typeof updatePageResponseSchema>;

export const pageByHandleResponseSchema = v.object({
	page: pageResponseSchema,
	items: v.array(grid.pageItemResponseSchema),
	visitorsEnabled: v.optional(v.boolean()),
});

export type PageByHandleResponse = v.InferOutput<
	typeof pageByHandleResponseSchema
>;

export const pageItemMetadataRequestSchema = v.object({
	itemId: v.pipe(v.string(), v.minLength(1)),
	url: grid.pageItemLinkUrlSchema,
});

export type PageItemMetadataRequest = v.InferOutput<
	typeof pageItemMetadataRequestSchema
>;

export const pageItemMetadataResponseSchema = v.object({
	item: grid.pageItemResponseSchema,
});

export type PageItemMetadataResponse = v.InferOutput<
	typeof pageItemMetadataResponseSchema
>;

export const myPageResponseSchema = v.object({
	page: v.nullable(pageResponseSchema),
});

export type MyPageResponse = v.InferOutput<typeof myPageResponseSchema>;

export const profileImageUploadRequestSchema = v.object({
	contentType: v.pipe(v.string(), v.trim(), v.regex(/^image\/[a-z0-9.+-]+$/i)),
	size: v.pipe(v.number(), v.integer(), v.minValue(1)),
});

export type ProfileImageUploadRequest = v.InferOutput<
	typeof profileImageUploadRequestSchema
>;

export const profileImageUploadSlotSchema = v.object({
	objectKey: v.pipe(v.string(), v.minLength(1)),
	uploadUrl: v.pipe(v.string(), v.url()),
	expiresAt: v.string(),
	contentType: v.pipe(v.string(), v.minLength(1)),
	cacheControl: v.nullable(v.string()),
});

export const profileImageUploadResponseSchema = v.object({
	source: profileImageUploadSlotSchema,
	expectedImage: profileImageStateSchema,
});

export type ProfileImageUploadResponse = v.InferOutput<
	typeof profileImageUploadResponseSchema
>;

export const profileImageCompleteRequestSchema = v.object({
	sourceObjectKey: v.pipe(v.string(), v.minLength(1)),
	crop: profileImageCropSchema,
	expectedImage: profileImageStateSchema,
});

export type ProfileImageCompleteRequest = v.InferOutput<
	typeof profileImageCompleteRequestSchema
>;

export const profileImageCompleteResponseSchema = updatePageResponseSchema;
export type ProfileImageCompleteResponse = UpdatePageResponse;

export const handleAvailabilityQuerySchema = v.object({
	handle: pageHandleSchema,
});

export type HandleAvailabilityQuery = v.InferOutput<
	typeof handleAvailabilityQuerySchema
>;

export const handleAvailabilityReasonSchema = v.union([
	v.literal("invalid"),
	v.literal("reserved"),
	v.literal("taken"),
	v.null(),
]);

export const handleAvailabilityResponseSchema = v.object({
	handle: v.string(),
	available: v.boolean(),
	reason: handleAvailabilityReasonSchema,
});

export type HandleAvailabilityResponse = v.InferOutput<
	typeof handleAvailabilityResponseSchema
>;

export * from "./grid";
export * from "./link";
