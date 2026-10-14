import { pgTable, primaryKey, text, timestamp } from "drizzle-orm/pg-core";

import { user } from "./auth";

/**
 * GA4 server events that may be sent only once per user (sign_up,
 * page_created, first_link_added). The primary key makes "is this the first
 * time?" and "remember it" one atomic insert, so retries never send twice.
 */
export const analyticsEvents = pgTable(
	"analytics_events",
	{
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		eventName: text("event_name").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => [primaryKey({ columns: [table.userId, table.eventName] })],
);
