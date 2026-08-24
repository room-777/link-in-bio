ALTER TABLE "pages" ADD COLUMN "lifecycle_status" text DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "pages" ADD COLUMN "deletion_scheduled_at" timestamp;--> statement-breakpoint
CREATE INDEX "pages_deletion_scheduled_at_idx" ON "pages" USING btree ("deletion_scheduled_at");