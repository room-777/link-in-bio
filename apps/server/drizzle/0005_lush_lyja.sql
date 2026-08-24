CREATE TABLE "page_items" (
	"id" text PRIMARY KEY NOT NULL,
	"page_id" text NOT NULL,
	"type" text NOT NULL,
	"data" jsonb NOT NULL,
	"style" jsonb NOT NULL,
	"layouts" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "page_items" ADD CONSTRAINT "page_items_page_id_pages_id_fk" FOREIGN KEY ("page_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "page_items_page_id_idx" ON "page_items" USING btree ("page_id");--> statement-breakpoint
CREATE INDEX "page_items_page_created_id_idx" ON "page_items" USING btree ("page_id","created_at","id");