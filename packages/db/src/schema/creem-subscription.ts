import {
	boolean,
	index,
	jsonb,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
} from "drizzle-orm/pg-core";
import { user } from "./auth";

export const creemSubscription = pgTable(
	"creem_subscription",
	{
		id: text("id").primaryKey(),
		productId: text("product_id").notNull(),
		referenceId: text("reference_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		creemCustomerId: text("creem_customer_id"),
		creemSubscriptionId: text("creem_subscription_id"),
		checkoutId: text("checkout_id"),
		checkoutUrl: text("checkout_url"),
		creemOrderId: text("creem_order_id"),
		status: text("status").default("pending"),
		periodStart: timestamp("period_start", { withTimezone: true }),
		periodEnd: timestamp("period_end", { withTimezone: true }),
		cancelAtPeriodEnd: boolean("cancel_at_period_end").default(false),
		lastWebhookId: text("last_webhook_id"),
		lastWebhookCreatedAt: timestamp("last_webhook_created_at", {
			withTimezone: true,
		}),
		lastWebhookState:
			jsonb("last_webhook_state").$type<Record<string, unknown>>(),
	},
	(table) => [
		index("creem_subscription_referenceId_idx").on(table.referenceId),
		uniqueIndex("creem_subscription_creemSubscriptionId_unique").on(
			table.creemSubscriptionId,
		),
		uniqueIndex("creem_subscription_checkoutId_unique").on(table.checkoutId),
	],
);
