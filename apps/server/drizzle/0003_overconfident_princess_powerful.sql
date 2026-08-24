ALTER TABLE "user" ADD COLUMN "primary_page_id" text;--> statement-breakpoint
UPDATE "user"
SET "primary_page_id" = (
	SELECT "pages"."id"
	FROM "pages"
	WHERE "pages"."user_id" = "user"."id"
	ORDER BY "pages"."created_at" ASC, "pages"."id" ASC
	LIMIT 1
)
WHERE EXISTS (
	SELECT 1
	FROM "pages"
	WHERE "pages"."user_id" = "user"."id"
);--> statement-breakpoint
ALTER TABLE "user" DROP COLUMN "has_page";
