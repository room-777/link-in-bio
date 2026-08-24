CREATE TABLE "pages" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"handle" text NOT NULL,
	"name" text NOT NULL,
	"bio" text,
	"image" text,
	"role" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "pages" ADD CONSTRAINT "pages_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "pages_handle_idx" ON "pages" USING btree ("handle");--> statement-breakpoint
CREATE INDEX "pages_userId_idx" ON "pages" USING btree ("user_id");--> statement-breakpoint
ALTER TABLE "pages" ENABLE ROW LEVEL SECURITY;
