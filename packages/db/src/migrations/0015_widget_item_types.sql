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
UPDATE "page_items"
SET "type" = 'tweet',
	"data" = pg_temp.without_nulls(jsonb_build_object(
		'url', "data" -> 'url',
		'authorName', "data" #> '{metadata,providerData,tweet,authorName}',
		'authorProfileUrl', "data" #> '{metadata,providerData,tweet,authorProfileUrl}',
		'authorProfileImageUrl', "data" #> '{metadata,providerData,tweet,authorProfileImageUrl}',
		'tweet', "data" #> '{metadata,providerData,tweet,response}'
	))
WHERE "type" = 'link' AND "data" #>> '{metadata,provider}' = 'tweet';--> statement-breakpoint
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
