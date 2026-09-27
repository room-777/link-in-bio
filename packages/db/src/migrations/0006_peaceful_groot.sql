ALTER TABLE "creem_subscription" ADD COLUMN "checkout_id" text;--> statement-breakpoint
ALTER TABLE "creem_subscription" ADD COLUMN "checkout_url" text;--> statement-breakpoint
CREATE UNIQUE INDEX "creem_subscription_checkoutId_unique" ON "creem_subscription" USING btree ("checkout_id");