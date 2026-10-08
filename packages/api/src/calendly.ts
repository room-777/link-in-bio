import * as v from "valibot";

export const calendlyEventTypeSchema = v.object({
	uri: v.string(),
	name: v.string(),
	duration: v.nullable(v.number()),
	description: v.nullable(v.string()),
	schedulingUrl: v.string(),
	active: v.boolean(),
});

export type CalendlyEventType = v.InferOutput<typeof calendlyEventTypeSchema>;

export const calendlyConnectionStatusSchema = v.object({
	connected: v.boolean(),
});

export const calendlyEventsResponseSchema = v.object({
	events: v.array(calendlyEventTypeSchema),
});

export const calendlyAvailabilityTimeSchema = v.object({
	startTime: v.string(),
	schedulingUrl: v.string(),
});

export type CalendlyAvailabilityTime = v.InferOutput<
	typeof calendlyAvailabilityTimeSchema
>;

export const calendlyAvailabilityResponseSchema = v.object({
	times: v.array(calendlyAvailabilityTimeSchema),
});

export const calendlyWidgetResponseSchema = v.object({
	event: v.nullable(calendlyEventTypeSchema),
	times: v.array(calendlyAvailabilityTimeSchema),
});
