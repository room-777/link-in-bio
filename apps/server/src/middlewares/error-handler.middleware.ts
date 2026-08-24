import type { AppEnv } from "@core/app-factory";
import type { ErrorHandler } from "hono";
import { HTTPException } from "hono/http-exception";

const ERROR_CODE_BY_STATUS = {
	400: "BAD_REQUEST",
	401: "UNAUTHORIZED",
	403: "FORBIDDEN",
	404: "NOT_FOUND",
	405: "METHOD_NOT_ALLOWED",
	408: "REQUEST_TIMEOUT",
	409: "CONFLICT",
	422: "UNPROCESSABLE_ENTITY",
	429: "TOO_MANY_REQUESTS",
	500: "INTERNAL_SERVER_ERROR",
	502: "BAD_GATEWAY",
	503: "SERVICE_UNAVAILABLE",
	504: "GATEWAY_TIMEOUT",
} as const;

const resolveErrorCode = (
	error: unknown,
	status: number,
) => {
	if (
		typeof error === "object" &&
		error !== null &&
		"code" in error &&
		typeof error.code === "string"
	) {
		return error.code;
	}

	return (
		ERROR_CODE_BY_STATUS[
			status as keyof typeof ERROR_CODE_BY_STATUS
		] ?? "UNKNOWN_ERROR"
	);
};

export const errorHandler: ErrorHandler<
	AppEnv
> = (err, c) => {
	if (err instanceof HTTPException) {
		return c.json(
			{
				error: {
					code: resolveErrorCode(
						err,
						err.status,
					),
					message: err.message,
				},
			},
			err.status,
		);
	}

	console.error(err);

	return c.json(
		{
			error: {
				code: "INTERNAL_SERVER_ERROR",
				message:
					"Internal Server Error",
			},
		},
		500,
	);
};
