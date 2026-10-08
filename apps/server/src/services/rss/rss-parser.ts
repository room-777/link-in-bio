import type { RssFeedResponse } from "@grabbin/api";
import Parser from "rss-parser";
import type { RssSource } from "./rss-source";

const MAX_RSS_ITEMS = 20;

type RssFieldValue =
	| string
	| {
			$: Record<string, string | undefined>;
			url?: string;
	  }
	| undefined;

type RssParserItem = Parser.Item & {
	author?: string | string[];
	"atom:updated"?: string | string[];
	"content:encoded"?: string | string[];
	"dc:creator"?: string | string[];
	"dcterms:modified"?: string | string[];
	description?: string | string[];
	"media:content"?: RssFieldValue[];
	"media:thumbnail"?: RssFieldValue[];
	modified?: string | string[];
	"note:creatorName"?: string | string[];
	updated?: string | string[];
};

const rssParser = new Parser<Record<string, never>, RssParserItem>({
	customFields: {
		item: [
			["atom:updated", "atom:updated", { keepArray: true }],
			["dcterms:modified", "dcterms:modified", { keepArray: true }],
			["media:content", "media:content", { keepArray: true }],
			["media:thumbnail", "media:thumbnail", { keepArray: true }],
			["note:creatorName", "note:creatorName", { keepArray: true }],
			["updated", "updated", { keepArray: true }],
			["modified", "modified", { keepArray: true }],
		],
	},
});

function getStrings(value: unknown): string[] {
	if (typeof value === "string") return value.trim() ? [value.trim()] : [];
	if (Array.isArray(value)) return value.flatMap(getStrings);
	return [];
}

function getFieldUrl(value: RssFieldValue): string | undefined {
	if (typeof value === "string") return value;
	return value?.url ?? value?.$.url;
}

function toHttpsUrl(value: string | undefined, baseUrl: string) {
	if (!value) return undefined;
	try {
		const url = new URL(value, baseUrl);
		return url.protocol === "https:" ? url.toString() : undefined;
	} catch {
		return undefined;
	}
}

function normalizeDate(value: unknown) {
	const dateValue = getStrings(value)[0];
	if (!dateValue) return undefined;
	const date = new Date(dateValue);
	return Number.isNaN(date.valueOf()) ? undefined : date.toISOString();
}

function getEnclosureImage(item: RssParserItem, feedUrl: string) {
	const enclosure = item.enclosure;
	if (!enclosure?.type?.startsWith("image/")) return undefined;
	return toHttpsUrl(enclosure.url, feedUrl);
}

function getMediaImage(values: RssFieldValue[] | undefined, feedUrl: string) {
	for (const value of values ?? []) {
		const mediaType = typeof value === "string" ? undefined : value?.$.type;
		const mediaMedium = typeof value === "string" ? undefined : value?.$.medium;
		if (
			(mediaType && !mediaType.startsWith("image/")) ||
			(mediaMedium && mediaMedium !== "image")
		)
			continue;
		const imageUrl = toHttpsUrl(getFieldUrl(value), feedUrl);
		if (imageUrl) return imageUrl;
	}
	return undefined;
}

function getHtmlImageUrl(value: unknown, feedUrl: string) {
	for (const html of getStrings(value)) {
		const src = html.match(/<img\b[^>]*\bsrc\s*=\s*(["'])(.*?)\1/i)?.[2];
		const imageUrl = toHttpsUrl(src, feedUrl);
		if (imageUrl) return imageUrl;
	}
	return undefined;
}

function getItemImage(item: RssParserItem, feedUrl: string) {
	return (
		getEnclosureImage(item, feedUrl) ??
		getMediaImage(item["media:thumbnail"], feedUrl) ??
		getMediaImage(item["media:content"], feedUrl) ??
		getHtmlImageUrl(item["content:encoded"], feedUrl) ??
		getHtmlImageUrl(item.content, feedUrl) ??
		getHtmlImageUrl(item.description, feedUrl)
	);
}

function parseItem(item: RssParserItem, source: RssSource) {
	const title = getStrings(item.title)[0];
	const url = toHttpsUrl(getStrings(item.link)[0], source.feedUrl);
	if (!title || !url) return undefined;

	const authors = [
		...getStrings(item.creator),
		...getStrings(item.author),
		...getStrings(item["dc:creator"]),
		...getStrings(item["note:creatorName"]),
	].filter((author, index, values) => values.indexOf(author) === index);
	const publishedAt = normalizeDate(item.isoDate ?? item.pubDate);
	const updatedAt = normalizeDate(
		item["atom:updated"] ??
			item.updated ??
			item.modified ??
			item["dcterms:modified"],
	);
	const imageUrl = getItemImage(item, source.feedUrl);

	return {
		id: getStrings(item.guid)[0] ?? url,
		title,
		url,
		publishedAt: publishedAt ?? null,
		updatedAt: updatedAt ?? null,
		authors,
		imageUrl: imageUrl ?? null,
		tags: getStrings(item.categories),
	} satisfies RssFeedResponse["items"][number];
}

export async function parseRssFeed(
	xml: string,
	source: RssSource,
): Promise<RssFeedResponse | undefined> {
	try {
		const parsedFeed = await rssParser.parseString(xml);
		const items = parsedFeed.items
			.slice(0, MAX_RSS_ITEMS)
			.map((item) => parseItem(item, source))
			.filter((item): item is NonNullable<typeof item> => Boolean(item));
		const title = getStrings(parsedFeed.title)[0];

		return {
			source: {
				inputUrl: source.inputUrl,
				feedUrl: source.feedUrl,
				platform: source.platform,
				type: source.type,
				iconUrl: source.iconUrl,
				title: title ?? null,
			},
			items,
		};
	} catch {
		return undefined;
	}
}
