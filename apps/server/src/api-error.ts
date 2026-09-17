import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";

export type ApiError = {
	title: string;
	status: ContentfulStatusCode;
	detail: string;
	code: string;
	requestId?: string;
};

const defaultErrors: Record<
	number,
	Pick<ApiError, "title" | "detail" | "code">
> = {
	400: {
		title: "Bad Request",
		detail: "잘못된 요청입니다.",
		code: "BAD_REQUEST",
	},
	401: {
		title: "Unauthorized",
		detail: "인증이 필요합니다.",
		code: "UNAUTHORIZED",
	},
	403: {
		title: "Forbidden",
		detail: "접근 권한이 없습니다.",
		code: "FORBIDDEN",
	},
	404: {
		title: "Not Found",
		detail: "요청한 리소스를 찾을 수 없습니다.",
		code: "NOT_FOUND",
	},
	405: {
		title: "Method Not Allowed",
		detail: "허용되지 않은 요청 방식입니다.",
		code: "METHOD_NOT_ALLOWED",
	},
	409: {
		title: "Conflict",
		detail: "요청이 현재 상태와 충돌합니다.",
		code: "CONFLICT",
	},
	422: {
		title: "Unprocessable Entity",
		detail: "요청을 처리할 수 없습니다.",
		code: "UNPROCESSABLE_ENTITY",
	},
	429: {
		title: "Too Many Requests",
		detail: "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.",
		code: "TOO_MANY_REQUESTS",
	},
	500: {
		title: "Internal Server Error",
		detail: "서버에서 오류가 발생했습니다.",
		code: "INTERNAL_SERVER_ERROR",
	},
	502: {
		title: "Bad Gateway",
		detail: "서버 응답이 올바르지 않습니다.",
		code: "BAD_GATEWAY",
	},
	503: {
		title: "Service Unavailable",
		detail: "서버를 일시적으로 사용할 수 없습니다.",
		code: "SERVICE_UNAVAILABLE",
	},
	504: {
		title: "Gateway Timeout",
		detail: "서버 응답 시간이 초과되었습니다.",
		code: "GATEWAY_TIMEOUT",
	},
};

type ApiErrorInput = Omit<ApiError, "title" | "detail" | "code"> &
	Partial<Pick<ApiError, "title" | "detail" | "code">>;

export function jsonApiError(c: Context, error: ApiErrorInput) {
	const defaults = defaultErrors[error.status] ?? {
		title: "Request Error",
		detail: "요청을 처리할 수 없습니다.",
		code: "REQUEST_ERROR",
	};
	const response = c.json(
		{
			...error,
			title: error.title ?? defaults.title,
			detail: error.detail ?? defaults.detail,
			code: error.code ?? defaults.code,
		},
		error.status,
	);
	response.headers.set("Content-Type", "application/problem+json");

	return response;
}
