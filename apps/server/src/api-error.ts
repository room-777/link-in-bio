import { type ApiErrorInput, apiErrorDefaults } from "@grabbin/api";
import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";

export function jsonApiError(c: Context, error: ApiErrorInput) {
	const defaults = apiErrorDefaults[
		error.status as keyof typeof apiErrorDefaults
	] ?? {
		title: "Request Error",
		detail: "The request could not be processed.",
		code: "REQUEST_ERROR",
	};
	const response = c.json(
		{
			...error,
			title: error.title ?? defaults.title,
			detail: error.detail ?? defaults.detail,
			code: error.code ?? defaults.code,
		},
		error.status as ContentfulStatusCode,
	);
	response.headers.set("Content-Type", "application/problem+json");

	return response;
}
