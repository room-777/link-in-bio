import { boolean, index, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const creemSubscription = pgTable(
	"creem_subscription",
	{
		id: text("id").primaryKey(),
		productId: text("product_id").notNull(),
		referenceId: text("reference_id").notNull(),
		creemCustomerId: text("creem_customer_id"),
		creemSubscriptionId: text("creem_subscription_id"),
		creemOrderId: text("creem_order_id"),
		status: text("status").default("pending"),
		periodStart: timestamp("period_start", { withTimezone: true }),
		periodEnd: timestamp("period_end", { withTimezone: true }),
		cancelAtPeriodEnd: boolean("cancel_at_period_end").default(false),
	},
	(table) => [
		index("creem_subscription_referenceId_idx").on(table.referenceId),
		index("creem_subscription_creemSubscriptionId_idx").on(
			table.creemSubscriptionId,
		),
	],
);
