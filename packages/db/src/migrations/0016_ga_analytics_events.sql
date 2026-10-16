CREATE TABLE "analytics_events" (
	"user_id" text NOT NULL,
	"event_name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "analytics_events_user_id_event_name_pk" PRIMARY KEY("user_id","event_name")
);
--> statement-breakpoint
ALTER TABLE "analytics_events" ADD CONSTRAINT "analytics_events_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
-- Existing accounts and links predate server events, so mark those events as sent.
INSERT INTO "analytics_events" ("user_id", "event_name", "created_at")
SELECT "id", 'sign_up', "created_at" FROM "user"
ON CONFLICT DO NOTHING;--> statement-breakpoint
INSERT INTO "analytics_events" ("user_id", "event_name", "created_at")
SELECT "pages"."user_id", 'first_link_added', min("page_items"."created_at")
FROM "page_items" JOIN "pages" ON "pages"."id" = "page_items"."page_id"
GROUP BY "pages"."user_id"
ON CONFLICT DO NOTHING;
