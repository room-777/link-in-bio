CREATE TABLE "page_media_assets" (
	"object_key" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"page_id" text NOT NULL,
	"status" text NOT NULL,
	"delete_after" timestamp with time zone,
	"upload_expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "page_media_assets_status_check" CHECK ("page_media_assets"."status" in ('pending', 'attached', 'pending_delete'))
);
--> statement-breakpoint
CREATE INDEX "page_media_assets_cleanup_idx" ON "page_media_assets" USING btree ("status","delete_after");--> statement-breakpoint
CREATE INDEX "page_media_assets_page_idx" ON "page_media_assets" USING btree ("page_id","status");
--> statement-breakpoint
INSERT INTO "page_media_assets" (
	"object_key",
	"user_id",
	"page_id",
	"status",
	"delete_after",
	"upload_expires_at"
)
SELECT
	"image_key",
	"user_id",
	"id",
	'attached',
	NULL::timestamp with time zone,
	now()
FROM "pages"
WHERE "image_key" LIKE ('users/' || "user_id" || '/pages/' || "id" || '/profile/%')
UNION
SELECT
	"page_items"."data"->>'objectKey',
	"pages"."user_id",
	"pages"."id",
	'attached',
	NULL::timestamp with time zone,
	now()
FROM "page_items"
JOIN "pages" ON "pages"."id" = "page_items"."page_id"
WHERE "page_items"."type" = 'media'
	AND "page_items"."data"->>'objectKey' LIKE ('users/' || "pages"."user_id" || '/pages/' || "pages"."id" || '/items/%')
UNION
SELECT
	"page_items"."data"->>'imageKey',
	"pages"."user_id",
	"pages"."id",
	'attached',
	NULL::timestamp with time zone,
	now()
FROM "page_items"
JOIN "pages" ON "pages"."id" = "page_items"."page_id"
WHERE "page_items"."type" = 'link'
	AND "page_items"."data"->>'imageKey' LIKE ('users/' || "pages"."user_id" || '/pages/' || "pages"."id" || '/items/%')
ON CONFLICT ("object_key") DO NOTHING;
