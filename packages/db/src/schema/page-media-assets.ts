import { sql } from "drizzle-orm";
import { check, index, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const pageMediaAssetStatuses = [
	"pending",
	"attached",
	"pending_delete",
] as const;

export type PageMediaAssetStatus = (typeof pageMediaAssetStatuses)[number];

export const pageMediaAssets = pgTable(
	"page_media_assets",
	{
		objectKey: text("object_key").primaryKey(),
		userId: text("user_id").notNull(),
		pageId: text("page_id").notNull(),
		status: text("status").$type<PageMediaAssetStatus>().notNull(),
		deleteAfter: timestamp("delete_after", { withTimezone: true }),
		uploadExpiresAt: timestamp("upload_expires_at", {
			withTimezone: true,
		}).notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(table) => [
		check(
			"page_media_assets_status_check",
			sql`${table.status} in ('pending', 'attached', 'pending_delete')`,
		),
		index("page_media_assets_cleanup_idx").on(table.status, table.deleteAfter),
		index("page_media_assets_page_idx").on(table.pageId, table.status),
	],
);
