import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { user } from "./auth";

export const calendlyConnection = pgTable("calendly_connection", {
	userId: text("user_id")
		.primaryKey()
		.references(() => user.id, { onDelete: "cascade" }),
	ownerUri: text("owner_uri").notNull(),
	accessToken: text("access_token").notNull(),
	refreshToken: text("refresh_token").notNull(),
	accessTokenExpiresAt: timestamp("access_token_expires_at", {
		withTimezone: true,
	}).notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true })
		.defaultNow()
		.notNull(),
});
