import { relations } from "drizzle-orm";
import {
	index,
	jsonb,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
} from "drizzle-orm/pg-core";

import { user } from "./auth";

export const pages = pgTable(
	"pages",
	{
		id: text("id").primaryKey(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		handle: text("handle").notNull(),
		name: text("name"),
		bio: text("bio"),
		image: text("image"),
		imageSource: text("image_source"),
		imageCrop: jsonb("image_crop").$type<Record<string, number> | null>(),
		role: text("role"),
		deletionScheduledAt: timestamp("deletion_scheduled_at", {
			withTimezone: true,
		}),
		createdAt: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.defaultNow()
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.notNull(),
	},
	(table) => [
		uniqueIndex("pages_handle_idx").on(table.handle),
		index("pages_userId_idx").on(table.userId),
		index("pages_deletion_scheduled_at_idx").on(table.deletionScheduledAt),
	],
);

export const pageItems = pgTable(
	"page_items",
	{
		id: text("id").primaryKey(),
		pageId: text("page_id")
			.notNull()
			.references(() => pages.id, { onDelete: "cascade" }),
		type: text("type").notNull(),
		data: jsonb("data").$type<Record<string, unknown>>().notNull(),
		style: jsonb("style").$type<Record<string, unknown>>().notNull(),
		layouts: jsonb("layouts")
			.$type<{
				wide: { x: number; y: number; w: number; h: number };
				compact: { x: number; y: number; w: number; h: number };
			}>()
			.notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.defaultNow()
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.notNull(),
	},
	(table) => [
		index("page_items_page_id_idx").on(table.pageId),
		index("page_items_page_created_id_idx").on(
			table.pageId,
			table.createdAt,
			table.id,
		),
	],
);

export const pagesRelations = relations(pages, ({ one, many }) => ({
	user: one(user, {
		fields: [pages.userId],
		references: [user.id],
	}),
	items: many(pageItems),
}));

export const pageItemsRelations = relations(pageItems, ({ one }) => ({
	page: one(pages, {
		fields: [pageItems.pageId],
		references: [pages.id],
	}),
}));
