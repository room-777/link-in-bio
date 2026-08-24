import type { AppEnv } from "@core/app-factory";
import { buildBillingStatus } from "@core/billing";
import { creemSubscription } from "@db/schema";
import { desc, eq } from "drizzle-orm";
import { Hono } from "hono";

import { UnauthorizedError } from "../exceptions/http-exceptions";

export const billingController =
	new Hono<AppEnv>().get(
		"/status",
		async (c) => {
			const user = c.get("user");
			if (!user)
				throw new UnauthorizedError();

			const subscriptions = await c
				.get("db")
				.query.creemSubscription.findMany(
					{
						where: eq(
							creemSubscription.referenceId,
							user.id,
						),
						orderBy: [
							desc(
								creemSubscription.periodEnd,
							),
						],
					},
				);

			return c.json(
				buildBillingStatus(
					subscriptions,
				),
			);
		},
	);
