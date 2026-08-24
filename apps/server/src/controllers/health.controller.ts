import type { AppEnv } from "@core/app-factory";
import {
	healthResponseSchema,
	type HealthResponse,
} from "@grabbin/api";
import { Hono } from "hono";
import { parse } from "valibot";

export const healthController =
	new Hono<AppEnv>().get(
		"/health",
		(c) => {
			const response = parse(healthResponseSchema, {
				status: "ok",
				timestamp: new Date().toISOString(),
			}) satisfies HealthResponse;

			return c.json(response, 200, {
				"Cache-Control": "no-store",
			});
		},
	);
