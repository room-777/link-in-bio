DROP INDEX "pages_deletion_scheduled_at_idx";--> statement-breakpoint
ALTER TABLE "user" DROP COLUMN "primary_page_handle";--> statement-breakpoint
ALTER TABLE "pages" DROP COLUMN "deletion_scheduled_at";