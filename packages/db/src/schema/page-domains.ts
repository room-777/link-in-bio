import {
	index,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
} from "drizzle-orm/pg-core";
import { pages } from "./pages";

export const pageDomains = pgTable(
	"page_domains",
	{
		id: text("id").primaryKey(),
		// Keep the provider ID after page/account deletion so scheduled cleanup can retry.
		pageId: text("page_id").references(() => pages.id, {
			onDelete: "set null",
		}),
		hostname: text("hostname").notNull(),
		verificationToken: text("verification_token").notNull(),
		status: text("status", {
			enum: ["waiting_dns", "provisioning", "active", "deleting"],
		})
			.notNull()
			.default("waiting_dns"),
		cloudflareHostnameId: text("cloudflare_hostname_id"),
		hostnameStatus: text("hostname_status"),
		certificateStatus: text("certificate_status"),
		verifiedAt: timestamp("verified_at", { withTimezone: true }),
		graceEndsAt: timestamp("grace_ends_at", { withTimezone: true }),
		lastCheckedAt: timestamp("last_checked_at", { withTimezone: true }),
		nextCheckAt: timestamp("next_check_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		lastError: text("last_error"),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow()
			.$onUpdate(() => new Date()),
	},
	(table) => [
		uniqueIndex("page_domains_hostname_unique").on(table.hostname),
		uniqueIndex("page_domains_page_id_unique").on(table.pageId),
		uniqueIndex("page_domains_cloudflare_id_unique").on(
			table.cloudflareHostnameId,
		),
		index("page_domains_next_check_idx").on(table.nextCheckAt),
	],
).enableRLS();
