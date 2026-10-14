-- RSS, Tweet and Spotify widgets were saved as links marked by
-- metadata.provider (and metadata.widget for Spotify). Give each its own
-- item type and keep only the fields its widget reads. Keys whose old value
-- is missing or JSON null are left out.
CREATE FUNCTION pg_temp.without_nulls(value jsonb) RETURNS jsonb
LANGUAGE sql IMMUTABLE AS $$
	SELECT coalesce(jsonb_object_agg(key, item), '{}'::jsonb)
	FROM jsonb_each(value) AS entry(key, item)
	WHERE jsonb_typeof(item) <> 'null'
$$;--> statement-breakpoint
UPDATE "page_items"
SET "type" = 'rss',
	"data" = pg_temp.without_nulls(jsonb_build_object(
		'url', "data" -> 'url',
		'title', CASE
			WHEN "data" #>> '{metadata,title}' = 'RSS Feed' THEN NULL
			ELSE "data" #> '{metadata,title}'
		END,
		'feed', "data" #> '{metadata,rss}'
	))
WHERE "type" = 'link' AND "data" #>> '{metadata,provider}' = 'rss-feed';--> statement-breakpoint
-- Older Tweet rows kept the author fields flat on providerData.
UPDATE "page_items"
SET "type" = 'tweet',
	"data" = pg_temp.without_nulls(jsonb_build_object(
		'url', "data" -> 'url',
		'authorName', source.tweet -> 'authorName',
		'authorProfileUrl', source.tweet -> 'authorProfileUrl',
		'authorProfileImageUrl', source.tweet -> 'authorProfileImageUrl',
		'tweet', source.tweet -> 'response'
	))
FROM (
	SELECT "id", CASE
		WHEN jsonb_typeof("data" #> '{metadata,providerData,tweet}') = 'object'
			THEN "data" #> '{metadata,providerData,tweet}'
		WHEN jsonb_typeof("data" #> '{metadata,providerData}') = 'object'
			THEN "data" #> '{metadata,providerData}'
		ELSE '{}'::jsonb
	END AS tweet
	FROM "page_items"
) AS source
WHERE "page_items"."id" = source."id"
	AND "type" = 'link' AND "data" #>> '{metadata,provider}' = 'tweet';--> statement-breakpoint
UPDATE "page_items"
SET "type" = 'spotify',
	"data" = pg_temp.without_nulls(jsonb_build_object(
		'url', "data" -> 'url',
		'title', "data" #> '{metadata,title}',
		'imageUrl', "data" #> '{metadata,imageUrl}',
		'spotify', "data" #> '{metadata,providerData,spotify}'
	))
WHERE "type" = 'link'
	AND "data" #>> '{metadata,provider}' = 'spotify'
	AND "data" #>> '{metadata,widget}' = 'spotify';
