import * as v from "valibot";

export type ApiError = {
	title: string;
	status: number;
	detail: string;
	code: string;
	requestId?: string;
};

export type ApiErrorInput = Omit<ApiError, "title" | "detail" | "code"> &
	Partial<Pick<ApiError, "title" | "detail" | "code">>;

export const apiErrorDefaults = {
	400: {
		title: "Bad Request",
		detail: "The request is invalid.",
		code: "BAD_REQUEST",
	},
	401: {
		title: "Unauthorized",
		detail: "Authentication is required.",
		code: "UNAUTHORIZED",
	},
	403: {
		title: "Forbidden",
		detail: "You do not have permission to access this resource.",
		code: "FORBIDDEN",
	},
	404: {
		title: "Not Found",
		detail: "The requested resource was not found.",
		code: "NOT_FOUND",
	},
	405: {
		title: "Method Not Allowed",
		detail: "The request method is not allowed.",
		code: "METHOD_NOT_ALLOWED",
	},
	409: {
		title: "Conflict",
		detail: "The request conflicts with the current state.",
		code: "CONFLICT",
	},
	422: {
		title: "Unprocessable Entity",
		detail: "The request could not be processed.",
		code: "UNPROCESSABLE_ENTITY",
	},
	429: {
		title: "Too Many Requests",
		detail: "Too many requests. Please try again later.",
		code: "TOO_MANY_REQUESTS",
	},
	500: {
		title: "Internal Server Error",
		detail: "The server encountered an error.",
		code: "INTERNAL_SERVER_ERROR",
	},
	502: {
		title: "Bad Gateway",
		detail: "The server response is invalid.",
		code: "BAD_GATEWAY",
	},
	503: {
		title: "Service Unavailable",
		detail: "The service is temporarily unavailable.",
		code: "SERVICE_UNAVAILABLE",
	},
	504: {
		title: "Gateway Timeout",
		detail: "The request timed out.",
		code: "GATEWAY_TIMEOUT",
	},
} as const;

const apiErrorSchema = v.object({
	title: v.string(),
	status: v.number(),
	detail: v.string(),
	code: v.string(),
	requestId: v.optional(v.string()),
});

export function getApiErrorMessage(
	body: unknown,
	fallback = "Please try again.",
) {
	const parsed = v.safeParse(apiErrorSchema, body);
	return parsed.success ? parsed.output.detail : fallback;
}
