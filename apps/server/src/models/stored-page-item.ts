/*
 * Rollout stage: before the follow-up data migration, RSS, Tweet and Spotify
 * widgets are still stored as links marked by data.metadata.provider (and
 * data.metadata.widget for Spotify). Every read of a page_items row goes
 * through readStoredPageItem so the rest of the server only sees the widget
 * item types. Delete this file once that migration has run in production.
 */

type StoredRow = { type: string; data: unknown };

function asRecord(value: unknown): Record<string, unknown> | undefined {
	return typeof value === "object" && value !== null && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: undefined;
}

function withoutMissing(entries: Record<string, unknown>) {
	return Object.fromEntries(
		Object.entries(entries).filter(
			([, value]) => value !== undefined && value !== null,
		),
	);
}

function convertLegacyWidget(data: Record<string, unknown>) {
	const metadata = asRecord(data.metadata);
	if (!metadata) return undefined;
	const providerData = asRecord(metadata.providerData);
	switch (metadata.provider) {
		case "rss-feed":
			return {
				type: "rss" as const,
				data: withoutMissing({
					url: data.url,
					title: metadata.title === "RSS Feed" ? undefined : metadata.title,
					feed: metadata.rss,
				}),
			};
		case "tweet": {
			// Older rows kept the author fields flat on providerData.
			const tweet = asRecord(providerData?.tweet) ?? providerData;
			return {
				type: "tweet" as const,
				data: withoutMissing({
					url: data.url,
					authorName: tweet?.authorName,
					authorProfileUrl: tweet?.authorProfileUrl,
					authorProfileImageUrl: tweet?.authorProfileImageUrl,
					tweet: tweet?.response,
				}),
			};
		}
		case "spotify":
			if (metadata.widget !== "spotify") return undefined;
			return {
				type: "spotify" as const,
				data: withoutMissing({
					url: data.url,
					title: metadata.title,
					imageUrl: metadata.imageUrl,
					spotify: providerData?.spotify,
				}),
			};
		default:
			return undefined;
	}
}

/**
 * Returns the row's item type and data, turning a link-shaped legacy widget
 * into its widget type. Callers validate the result as they did before.
 */
export function readStoredPageItem<Row extends StoredRow>(
	row: Row,
): Row & { data: Record<string, unknown> } {
	const data = asRecord(row.data) ?? {};
	const widget = row.type === "link" ? convertLegacyWidget(data) : undefined;
	return widget ? { ...row, ...widget } : { ...row, data };
}
