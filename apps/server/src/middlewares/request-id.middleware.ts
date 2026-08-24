import { requestId } from "hono/request-id";

export const requestIdMiddleware =
	requestId({
		generator: (c) =>
			c.req.header("cf-ray") ??
			crypto.randomUUID(),
	});
