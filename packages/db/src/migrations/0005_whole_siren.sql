CREATE TABLE "page_item_uploads" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"page_id" text NOT NULL,
	"item_id" text NOT NULL,
	"object_key" text NOT NULL,
	"content_type" text NOT NULL,
	"status" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "page_item_uploads" ADD CONSTRAINT "page_item_uploads_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "page_item_uploads" ADD CONSTRAINT "page_item_uploads_page_id_pages_id_fk" FOREIGN KEY ("page_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "page_item_uploads_object_key_idx" ON "page_item_uploads" USING btree ("object_key");--> statement-breakpoint
CREATE INDEX "page_item_uploads_page_id_idx" ON "page_item_uploads" USING btree ("page_id");--> statement-breakpoint
CREATE INDEX "page_item_uploads_expires_at_idx" ON "page_item_uploads" USING btree ("expires_at");