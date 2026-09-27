DROP INDEX "creem_subscription_creemSubscriptionId_idx";--> statement-breakpoint
ALTER TABLE "creem_subscription" ADD COLUMN "last_webhook_id" text;--> statement-breakpoint
ALTER TABLE "creem_subscription" ADD COLUMN "last_webhook_created_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "creem_subscription" ADD COLUMN "last_webhook_state" jsonb;--> statement-breakpoint
ALTER TABLE "creem_subscription" ADD CONSTRAINT "creem_subscription_reference_id_user_id_fk" FOREIGN KEY ("reference_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "creem_subscription_creemSubscriptionId_unique" ON "creem_subscription" USING btree ("creem_subscription_id");