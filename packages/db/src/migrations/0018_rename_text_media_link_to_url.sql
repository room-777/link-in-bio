-- Apply this after deploying the app version that reads both `link` and `url`.
-- The deploy workflow does not run migrations, and older app versions only read `link`.
-- To roll back the app, restore `link` from `url` before deploying the older version.
-- UPDATE "page_items" SET "data" = jsonb_set("data" - 'url', '{link}', "data" -> 'url', true)
-- WHERE "type" IN ('text', 'media') AND "data" ? 'url';
DO $$
BEGIN
	IF EXISTS (
		SELECT 1 FROM "page_items"
		WHERE "type" IN ('text', 'media')
			AND jsonb_typeof("data") IS DISTINCT FROM 'object'
	) THEN
		RAISE EXCEPTION 'Cannot rename item URLs: text or media data is not a JSON object.';
	END IF;

	IF EXISTS (
		SELECT 1 FROM "page_items"
		WHERE "type" IN ('text', 'media')
			AND "data" ? 'link'
			AND jsonb_typeof("data" -> 'link') IS DISTINCT FROM 'string'
	) THEN
		RAISE EXCEPTION 'Cannot rename item URLs: a text or media link is not a string.';
	END IF;

	IF EXISTS (
		SELECT 1 FROM "page_items"
		WHERE "type" IN ('text', 'media')
			AND "data" ? 'link'
			AND "data" ? 'url'
			AND ("data" -> 'link') IS DISTINCT FROM ("data" -> 'url')
	) THEN
		RAISE EXCEPTION 'Cannot rename item URLs: a text or media row has conflicting link and url values.';
	END IF;
END $$;--> statement-breakpoint
UPDATE "page_items"
SET "data" = jsonb_set(
	"data" - 'link',
	'{url}',
	coalesce("data" -> 'url', "data" -> 'link'),
	true
)
WHERE "type" IN ('text', 'media') AND "data" ? 'link';
