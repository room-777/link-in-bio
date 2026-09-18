import * as v from "valibot";

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

export const pageImageKeySchema = v.object({
	key: v.pipe(v.string(), v.maxLength(512)),
});

export const pageDataSchema = v.object({
	handle: v.string(),
	onboarding: v.boolean(),
	imageKey: v.nullable(v.string()),
	name: v.nullable(v.string()),
	bio: v.nullable(v.string()),
	isOwner: v.boolean(),
	canEdit: v.boolean(),
});

export const pageProfileSchema = v.object({
	imageKey: v.optional(v.nullable(v.pipe(v.string(), v.maxLength(512)))),
	name: v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(80)),
	bio: v.optional(v.pipe(v.string(), v.trim(), v.maxLength(280))),
});

export type PageData = v.InferOutput<typeof pageDataSchema>;
export type PageProfile = v.InferOutput<typeof pageProfileSchema>;
