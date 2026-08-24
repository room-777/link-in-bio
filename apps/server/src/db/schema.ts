import type { CreemWebhookState } from "@core/creem-webhook";
import type { ProfileImageCrop } from "@grabbin/api";
import { relations } from "drizzle-orm";
import {
	boolean,
	index,
	jsonb,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
} from "drizzle-orm/pg-core";

export const user = pgTable("user", {
	id: text("id").primaryKey(),
	name: text("name").notNull(),
	email: text("email")
		.notNull()
		.unique(),
	emailVerified: boolean(
		"email_verified",
	)
		.default(false)
		.notNull(),
	image: text("image"),
	primaryPageId: text(
		"primary_page_id",
	),
	creemCustomerId: text(
		"creem_customer_id",
	),
	hadTrial: boolean("had_trial")
		.default(false)
		.notNull(),
	role: text("role")
		.default("user")
		.notNull(),
	createdAt: timestamp("created_at")
		.defaultNow()
		.notNull(),
	updatedAt: timestamp("updated_at")
		.defaultNow()
		.$onUpdate(
			() => /* @__PURE__ */ new Date(),
		)
		.notNull(),
});

export const session = pgTable(
	"session",
	{
		id: text("id").primaryKey(),
		expiresAt: timestamp(
			"expires_at",
		).notNull(),
		token: text("token")
			.notNull()
			.unique(),
		createdAt: timestamp("created_at")
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at")
			.$onUpdate(
				() =>
					/* @__PURE__ */ new Date(),
			)
			.notNull(),
		ipAddress: text("ip_address"),
		userAgent: text("user_agent"),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, {
				onDelete: "cascade",
			}),
	},
	(table) => [
		index("session_userId_idx").on(
			table.userId,
		),
	],
);

export const account = pgTable(
	"account",
	{
		id: text("id").primaryKey(),
		accountId: text(
			"account_id",
		).notNull(),
		providerId: text(
			"provider_id",
		).notNull(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, {
				onDelete: "cascade",
			}),
		accessToken: text("access_token"),
		refreshToken: text("refresh_token"),
		idToken: text("id_token"),
		accessTokenExpiresAt: timestamp(
			"access_token_expires_at",
		),
		refreshTokenExpiresAt: timestamp(
			"refresh_token_expires_at",
		),
		scope: text("scope"),
		password: text("password"),
		createdAt: timestamp("created_at")
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at")
			.$onUpdate(
				() =>
					/* @__PURE__ */ new Date(),
			)
			.notNull(),
	},
	(table) => [
		index("account_userId_idx").on(
			table.userId,
		),
	],
);

export const verification = pgTable(
	"verification",
	{
		id: text("id").primaryKey(),
		identifier: text(
			"identifier",
		).notNull(),
		value: text("value").notNull(),
		expiresAt: timestamp(
			"expires_at",
		).notNull(),
		createdAt: timestamp("created_at")
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at")
			.defaultNow()
			.$onUpdate(
				() =>
					/* @__PURE__ */ new Date(),
			)
			.notNull(),
	},
	(table) => [
		index(
			"verification_identifier_idx",
		).on(table.identifier),
	],
);

export const providerTokens = pgTable(
	"provider_tokens",
	{
		provider:
			text("provider").primaryKey(),
		accessToken: text(
			"access_token",
		).notNull(),
		refreshToken: text("refresh_token"),
		accessTokenExpiresAt: timestamp(
			"access_token_expires_at",
		),
		createdAt: timestamp("created_at")
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at")
			.defaultNow()
			.notNull(),
	},
);

export const creemSubscription =
	pgTable(
		"creem_subscription",
		{
			id: text("id").primaryKey(),
			productId: text(
				"product_id",
			).notNull(),
			referenceId: text("reference_id")
				.notNull()
				.references(() => user.id, {
					onDelete: "cascade",
				}),
			creemCustomerId: text(
				"creem_customer_id",
			),
			creemSubscriptionId: text(
				"creem_subscription_id",
			),
			creemOrderId: text(
				"creem_order_id",
			),
			status: text("status")
				.default("pending")
				.notNull(),
			periodStart: timestamp(
				"period_start",
			),
			periodEnd: timestamp(
				"period_end",
			),
			cancelAtPeriodEnd: boolean(
				"cancel_at_period_end",
			)
				.default(false)
				.notNull(),
			lastWebhookId: text(
				"last_webhook_id",
			),
			lastWebhookCreatedAt: timestamp(
				"last_webhook_created_at",
			),
			lastWebhookState: jsonb(
				"last_webhook_state",
			).$type<CreemWebhookState | null>(),
		},
		(table) => [
			index(
				"creem_subscription_reference_id_idx",
			).on(table.referenceId),
			uniqueIndex(
				"creem_subscription_subscription_id_idx",
			).on(table.creemSubscriptionId),
		],
	);

export const pages = pgTable(
	"pages",
	{
		id: text("id").primaryKey(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, {
				onDelete: "cascade",
			}),
		handle: text("handle").notNull(),
		name: text("name"),
		bio: text("bio"),
		image: text("image"),
		imageSource: text("image_source"),
		imageCrop: jsonb(
			"image_crop",
		).$type<ProfileImageCrop | null>(),
		role: text("role"),
		deletionScheduledAt: timestamp(
			"deletion_scheduled_at",
		),
		createdAt: timestamp("created_at")
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at")
			.defaultNow()
			.$onUpdate(
				() =>
					/* @__PURE__ */ new Date(),
			)
			.notNull(),
	},
	(table) => [
		uniqueIndex("pages_handle_idx").on(
			table.handle,
		),
		index("pages_userId_idx").on(
			table.userId,
		),
		index(
			"pages_deletion_scheduled_at_idx",
		).on(table.deletionScheduledAt),
	],
);

export const pageItems = pgTable(
	"page_items",
	{
		id: text("id").primaryKey(),
		pageId: text("page_id")
			.notNull()
			.references(() => pages.id, {
				onDelete: "cascade",
			}),
		type: text("type").notNull(),
		data: jsonb("data")
			.$type<Record<string, unknown>>()
			.notNull(),
		style: jsonb("style")
			.$type<Record<string, unknown>>()
			.notNull(),
		layouts: jsonb("layouts")
			.$type<{
				wide: {
					x: number;
					y: number;
					w: number;
					h: number;
				};
				compact: {
					x: number;
					y: number;
					w: number;
					h: number;
				};
			}>()
			.notNull(),
		createdAt: timestamp("created_at")
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at")
			.defaultNow()
			.$onUpdate(
				() =>
					/* @__PURE__ */ new Date(),
			)
			.notNull(),
	},
	(table) => [
		index("page_items_page_id_idx").on(
			table.pageId,
		),
		index(
			"page_items_page_created_id_idx",
		).on(
			table.pageId,
			table.createdAt,
			table.id,
		),
	],
);

export const userRelations = relations(
	user,
	({ many }) => ({
		sessions: many(session),
		accounts: many(account),
		pages: many(pages),
		creemSubscriptions: many(
			creemSubscription,
		),
	}),
);

export const sessionRelations =
	relations(session, ({ one }) => ({
		user: one(user, {
			fields: [session.userId],
			references: [user.id],
		}),
	}));

export const accountRelations =
	relations(account, ({ one }) => ({
		user: one(user, {
			fields: [account.userId],
			references: [user.id],
		}),
	}));

export const pagesRelations = relations(
	pages,
	({ one, many }) => ({
		user: one(user, {
			fields: [pages.userId],
			references: [user.id],
		}),
		items: many(pageItems),
	}),
);

export const pageItemsRelations =
	relations(pageItems, ({ one }) => ({
		page: one(pages, {
			fields: [pageItems.pageId],
			references: [pages.id],
		}),
	}));

export const creemSubscriptionRelations =
	relations(
		creemSubscription,
		({ one }) => ({
			user: one(user, {
				fields: [
					creemSubscription.referenceId,
				],
				references: [user.id],
			}),
		}),
	);
