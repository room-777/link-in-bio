import * as v from "valibot";

import { normalizedCropSchema, pageItemResponseSchema } from "./grid";

export const createPageSchema = v.object({ handle: v.string() });

export const pageImageContentTypes = [
	"image/avif",
	"image/gif",
	"image/jpeg",
	"image/png",
	"image/webp",
] as const;

export const pageImageUploadSchema = v.object({
	contentType: v.picklist(pageImageContentTypes),
	size: v.pipe(
		v.number(),
		v.integer(),
		v.minValue(1),
		v.maxValue(5 * 1024 * 1024),
	),
});

export const pageImageCropSchema = normalizedCropSchema;
export type PageImageCrop = v.InferOutput<typeof pageImageCropSchema>;

export const pageImageKeySchema = v.object({
	key: v.pipe(v.string(), v.maxLength(512)),
});

export const pageDataSchema = v.object({
	id: v.string(),
	handle: v.string(),
	onboarding: v.boolean(),
	imageKey: v.nullable(v.string()),
	imageSource: v.nullable(v.string()),
	imageCrop: v.nullable(pageImageCropSchema),
	name: v.nullable(v.string()),
	bio: v.nullable(v.string()),
	isOwner: v.boolean(),
	canEdit: v.boolean(),
	hasProAccess: v.boolean(),
});

export const pageByHandleResponseSchema = v.object({
	page: pageDataSchema,
	items: v.array(pageItemResponseSchema),
});

export const publicViewsResponseSchema = v.object({
	todayViews: v.nullable(v.number()),
	yesterdayViews: v.nullable(v.number()),
});

const pageNameSchema = v.pipe(v.string(), v.trim(), v.maxLength(80));

export const updatePageDraftSchema = v.pipe(
	v.object({
		imageKey: v.optional(v.nullable(v.pipe(v.string(), v.maxLength(512)))),
		imageCrop: v.optional(v.nullable(pageImageCropSchema)),
		name: v.optional(v.nullable(pageNameSchema)),
		bio: v.optional(v.nullable(v.pipe(v.string(), v.trim(), v.maxLength(280)))),
	}),
	v.check(
		(draft) => Object.keys(draft).length > 0,
		"At least one profile field is required.",
	),
);

export type PageData = v.InferOutput<typeof pageDataSchema>;
export type PageByHandleResponse = v.InferOutput<
	typeof pageByHandleResponseSchema
>;
export type PublicViewsResponse = v.InferOutput<
	typeof publicViewsResponseSchema
>;
export type UpdatePageDraft = v.InferOutput<typeof updatePageDraftSchema>;

export const pageProfileSchema = v.object({
	imageKey: v.optional(v.nullable(v.pipe(v.string(), v.maxLength(512)))),
	imageCrop: v.optional(v.nullable(pageImageCropSchema)),
	name: v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(80)),
	bio: v.optional(v.nullable(v.pipe(v.string(), v.trim(), v.maxLength(280)))),
});

export type PageProfile = v.InferOutput<typeof pageProfileSchema>;
