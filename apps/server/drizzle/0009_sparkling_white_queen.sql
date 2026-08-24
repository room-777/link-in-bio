ALTER TABLE "creem_subscription" ADD COLUMN "last_webhook_id" text;--> statement-breakpoint
ALTER TABLE "creem_subscription" ADD COLUMN "last_webhook_created_at" timestamp;--> statement-breakpoint
ALTER TABLE "creem_subscription" ADD COLUMN "last_webhook_state" jsonb;