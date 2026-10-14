import { index, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

/**
 * One row per succeeded Creem refund. The refund id is the key, so a webhook
 * delivered twice is counted once; totals are summed per transaction.
 */
export const creemRefund = pgTable(
	"creem_refund",
	{
		id: text("id").primaryKey(),
		transactionId: text("transaction_id").notNull(),
		creemSubscriptionId: text("creem_subscription_id"),
		amount: integer("amount").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => [index("creem_refund_transactionId_idx").on(table.transactionId)],
);
