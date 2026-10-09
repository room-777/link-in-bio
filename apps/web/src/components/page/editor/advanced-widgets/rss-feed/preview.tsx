import type { RssFeedResponse } from "@grabbin/api";
import { getPresetGeometry } from "@grabbin/bento-layout";
import type { BentoItem } from "@/lib/bento/bento-types";
import { AdvancedWidgetPreviewFrame } from "../preview-frame";
import { RssFeedWidget } from "./widget";

const previewFeed: RssFeedResponse = {
	source: {
		inputUrl: "https://example.com/notes",
		pageUrl: "https://example.com/notes",
		feedUrl: "https://example.com/notes/feed",
		platform: "substack",
		type: "blog",
		iconUrl: "/api/provider-icons/substack.svg",
		title: "Billy's Substack",
	},
	items: [
		{
			id: "article-1",
			title: "A thoughtful guide to building better habits",
			url: "https://example.com/notes/better-habits",
			publishedAt: "2026-10-08T00:00:00.000Z",
			updatedAt: null,
			authors: ["Example Author"],
			imageUrl: null,
			tags: [],
		},
		{
			id: "article-2",
			title: "Notes from a week of focused work",
			url: "https://example.com/notes/focused-work",
			publishedAt: "2026-10-01T00:00:00.000Z",
			updatedAt: null,
			authors: ["Example Author"],
			imageUrl: null,
			tags: [],
		},
		{
			id: "article-3",
			title: "The stories we carry from one place to another",
			url: "https://example.com/notes/stories-we-carry",
			publishedAt: "2026-09-24T00:00:00.000Z",
			updatedAt: null,
			authors: ["Example Author"],
			imageUrl: null,
			tags: [],
		},
		{
			id: "article-4",
			title: "What makes a neighborhood feel like home?",
			url: "https://example.com/notes/neighborhood-home",
			publishedAt: "2026-09-17T00:00:00.000Z",
			updatedAt: null,
			authors: ["Example Author"],
			imageUrl: null,
			tags: [],
		},
		{
			id: "article-5",
			title: "A small collection of things worth remembering",
			url: "https://example.com/notes/things-worth-remembering",
			publishedAt: "2026-09-10T00:00:00.000Z",
			updatedAt: null,
			authors: ["Example Author"],
			imageUrl: null,
			tags: [],
		},
		{
			id: "article-6",
			title: "A few thoughts on making time for creative work",
			url: "https://example.com/notes/creative-work",
			publishedAt: "2026-09-03T00:00:00.000Z",
			updatedAt: null,
			authors: ["Example Author"],
			imageUrl: null,
			tags: [],
		},
	],
};

const previewItem: BentoItem = {
	id: "advanced-widget-preview-rss-feed",
	type: "link",
	data: {
		url: previewFeed.source.pageUrl,
		metadata: { title: "Billy's Substack", provider: "rss-feed" },
	},
	style: {},
	layouts: {
		wide: getPresetGeometry("squareLarge", "wide"),
		compact: getPresetGeometry("squareLarge", "compact"),
	},
	createdAt: "2026-10-09T00:00:00.000Z",
	updatedAt: "2026-10-09T00:00:00.000Z",
	preset: "squareLarge",
};

export function RssAdvancedWidgetPreview() {
	return (
		<AdvancedWidgetPreviewFrame item={previewItem}>
			<RssFeedWidget
				url={previewFeed.source.pageUrl}
				feed={previewFeed}
				title="Billy's Substack"
				preset="squareLarge"
				mode="view"
			/>
		</AdvancedWidgetPreviewFrame>
	);
}
