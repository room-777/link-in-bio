import * as v from "valibot";

export const reservedPageHandles = [
	"admin",
	"api",
	"auth",
	"billing",
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
	"sign-in",
	"sitemap",
	"terms",
	"update",
] as const;

const reservedPageHandleSet = new Set<string>(reservedPageHandles);

export const pageHandleSchema = v.pipe(
	v.string(),
	v.trim(),
	v.toLowerCase(),
	v.minLength(3, "At least 3 characters."),
	v.maxLength(30, "At most 30 characters."),
	v.regex(
		/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/,
		"Lowercase letters, numbers, and hyphens only.",
	),
	v.check((handle) => !handle.includes("--"), "No consecutive hyphens."),
);

export const handleAvailabilityResponseSchema = v.object({
	handle: v.string(),
	available: v.boolean(),
	reason: v.union([
		v.literal("invalid"),
		v.literal("reserved"),
		v.literal("taken"),
		v.null_(),
	]),
});

export type HandleAvailabilityResponse = v.InferOutput<
	typeof handleAvailabilityResponseSchema
>;

export function normalizePageHandle(handle: string): string {
	return handle.trim().toLowerCase();
}

export function isReservedPageHandle(handle: string): boolean {
	return reservedPageHandleSet.has(normalizePageHandle(handle));
}
