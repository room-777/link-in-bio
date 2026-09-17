CREATE TABLE "page_items" (
	"id" text PRIMARY KEY NOT NULL,
	"page_id" text NOT NULL,
	"type" text NOT NULL,
	"data" jsonb NOT NULL,
	"style" jsonb NOT NULL,
	"layouts" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pages" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"handle" text NOT NULL,
	"onboarding" boolean DEFAULT false NOT NULL,
	"name" text,
	"bio" text,
	"image" text,
	"image_source" text,
	"image_crop" jsonb,
	"role" text,
	"deletion_scheduled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "provider_tokens" (
	"provider" text PRIMARY KEY NOT NULL,
	"access_token" text NOT NULL,
	"refresh_token" text,
	"access_token_expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "primary_page_id" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "role" text DEFAULT 'user' NOT NULL;--> statement-breakpoint
ALTER TABLE "page_items" ADD CONSTRAINT "page_items_page_id_pages_id_fk" FOREIGN KEY ("page_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pages" ADD CONSTRAINT "pages_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "page_items_page_id_idx" ON "page_items" USING btree ("page_id");--> statement-breakpoint
CREATE INDEX "page_items_page_created_id_idx" ON "page_items" USING btree ("page_id","created_at","id");--> statement-breakpoint
CREATE UNIQUE INDEX "pages_handle_idx" ON "pages" USING btree ("handle");--> statement-breakpoint
CREATE INDEX "pages_userId_idx" ON "pages" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "pages_deletion_scheduled_at_idx" ON "pages" USING btree ("deletion_scheduled_at");