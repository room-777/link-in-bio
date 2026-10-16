import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

import { user } from "./auth";

/** Purchase claims keyed by Creem order ID so retries cannot count it twice. */
export const analyticsPurchases = pgTable("analytics_purchases", {
	orderId: text("order_id").primaryKey(),
	userId: text("user_id")
		.notNull()
		.references(() => user.id, { onDelete: "cascade" }),
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
}).enableRLS();
