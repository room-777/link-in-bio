import type { AppEnv } from "@core/app-factory";
import type { NotFoundHandler } from "hono";

export const notFoundHandler: NotFoundHandler<
	AppEnv
> = (c) => {
	return c.json(
		{
			error: {
				code: "ROUTE_NOT_FOUND",
				message: `Route not found: ${c.req.path}`,
			},
		},
		404,
	);
};
