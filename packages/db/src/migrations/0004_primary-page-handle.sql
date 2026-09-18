ALTER TABLE "user" RENAME COLUMN "primary_page_id" TO "primary_page_handle";--> statement-breakpoint
UPDATE "user" AS u
SET "primary_page_handle" = (
	SELECT p."handle"
	FROM "pages" AS p
	WHERE p."id" = u."primary_page_handle"
)
WHERE u."primary_page_handle" IS NOT NULL;--> statement-breakpoint
CREATE FUNCTION "sync_primary_page_handle"() RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
	IF NEW."handle" IS DISTINCT FROM OLD."handle" THEN
		UPDATE "user"
		SET "primary_page_handle" = NEW."handle"
		WHERE "id" = NEW."user_id"
			AND "primary_page_handle" = OLD."handle";
	END IF;
	RETURN NEW;
END;
$$;--> statement-breakpoint
CREATE TRIGGER "pages_sync_primary_page_handle"
AFTER UPDATE OF "handle" ON "pages"
FOR EACH ROW
EXECUTE FUNCTION "sync_primary_page_handle"();
