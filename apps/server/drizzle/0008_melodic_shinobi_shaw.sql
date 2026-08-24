CREATE TABLE "creem_subscription" (
	"id" text PRIMARY KEY NOT NULL,
	"product_id" text NOT NULL,
	"reference_id" text NOT NULL,
	"creem_customer_id" text,
	"creem_subscription_id" text,
	"creem_order_id" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"period_start" timestamp,
	"period_end" timestamp,
	"cancel_at_period_end" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "creem_customer_id" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "had_trial" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "creem_subscription" ADD CONSTRAINT "creem_subscription_reference_id_user_id_fk" FOREIGN KEY ("reference_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "creem_subscription_reference_id_idx" ON "creem_subscription" USING btree ("reference_id");--> statement-breakpoint
CREATE UNIQUE INDEX "creem_subscription_subscription_id_idx" ON "creem_subscription" USING btree ("creem_subscription_id");