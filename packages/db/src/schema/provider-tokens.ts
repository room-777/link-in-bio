import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const providerTokens = pgTable("provider_tokens", {
	provider: text("provider").primaryKey(),
	accessToken: text("access_token").notNull(),
	refreshToken: text("refresh_token"),
	accessTokenExpiresAt: timestamp("access_token_expires_at", {
		withTimezone: true,
	}),
	createdAt: timestamp("created_at", { withTimezone: true })
		.defaultNow()
		.notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true })
		.defaultNow()
		.notNull(),
});
