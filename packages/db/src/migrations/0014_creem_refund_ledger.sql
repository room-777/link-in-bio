CREATE TABLE "creem_refund" (
	"id" text PRIMARY KEY NOT NULL,
	"transaction_id" text NOT NULL,
	"creem_subscription_id" text,
	"amount" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "creem_refund_transactionId_idx" ON "creem_refund" USING btree ("transaction_id");