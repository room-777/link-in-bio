CREATE TABLE "page_domains" (
	"id" text PRIMARY KEY NOT NULL,
	"page_id" text,
	"hostname" text NOT NULL,
	"verification_token" text NOT NULL,
	"status" text DEFAULT 'waiting_dns' NOT NULL,
	"cloudflare_hostname_id" text,
	"hostname_status" text,
	"certificate_status" text,
	"verified_at" timestamp with time zone,
	"grace_ends_at" timestamp with time zone,
	"last_checked_at" timestamp with time zone,
	"next_check_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "page_domains" ADD CONSTRAINT "page_domains_page_id_pages_id_fk" FOREIGN KEY ("page_id") REFERENCES "public"."pages"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "page_domains_hostname_unique" ON "page_domains" USING btree ("hostname");--> statement-breakpoint
CREATE UNIQUE INDEX "page_domains_page_id_unique" ON "page_domains" USING btree ("page_id");--> statement-breakpoint
CREATE UNIQUE INDEX "page_domains_cloudflare_id_unique" ON "page_domains" USING btree ("cloudflare_hostname_id");--> statement-breakpoint
CREATE INDEX "page_domains_next_check_idx" ON "page_domains" USING btree ("next_check_at");