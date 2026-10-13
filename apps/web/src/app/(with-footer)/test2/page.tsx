"use client";

import { normalizeProviderData, type RssFeedResponse } from "@grabbin/api";
import {
	type BentoBreakpoint,
	type BentoLayoutMap,
	bentoGridMetrics,
	bentoWideMediaQuery,
	getPresetGeometry,
	type PresetName,
	placeAtFirstAvailable,
} from "@grabbin/bento-layout";
import { resolveLinkMetadata } from "@grabbin/page-link";
import { useEffect, useState } from "react";
import ReactGridLayout, {
	type EventCallback,
	type Layout as GridLayout,
} from "react-grid-layout";
import { getCompactor } from "react-grid-layout/core";
import {
	type CalendlyAvailability,
	CalendlyWidget,
} from "@/components/page/editor/advanced-widgets/calendly/calendly-widget";
import { BentoItemShell } from "@/components/page/editor/bento/bento-item-shell";
import {
	calendlyDemoAvailabilityTimes,
	calendlyDemoDateRange,
	calendlyDemoEvent,
} from "@/constant/widget/calendly";
import type { BentoItem } from "@/lib/bento/bento-types";

const timestamp = "2026-10-10T00:00:00.000Z";
const previewToday = new Date("2026-10-10T12:00:00.000Z");
const previewColumns: Record<BentoBreakpoint, number> = { wide: 8, compact: 6 };
const previewRows = 18;

function getPreviewWidth(breakpoint: BentoBreakpoint) {
	const { margin, rowHeight } = bentoGridMetrics[breakpoint];
	const squareSize = rowHeight * 2 + margin[1];
	return (
		squareSize * previewColumns[breakpoint] +
		margin[0] * (previewColumns[breakpoint] - 1)
	);
}

const twitchUrl = "https://www.twitch.tv/valorant";
const twitchMetadata = resolveLinkMetadata(twitchUrl, {
	title: "Live on Twitch",
	description:
		"VALORANT is a 5v5 character based tactical shooter video game from Riot Games.",
	imageUrl:
		"https://static-cdn.jtvnw.net/jtv_user_pictures/7fbb949e-fb09-46db-87df-5e757af9f060-profile_image-300x300.png",
	providerData: normalizeProviderData(
		{
			channelId: "490592527",
			followerCount: 4913352,
			profileImageUrl:
				"https://static-cdn.jtvnw.net/jtv_user_pictures/7fbb949e-fb09-46db-87df-5e757af9f060-profile_image-300x300.png",
		},
		"twitch",
	),
});
const chzzkUrl = "https://chzzk.naver.com/75cbf189b3bb8f9f687d2aca0d0a382b";
const chzzkMetadata = resolveLinkMetadata(chzzkUrl, {
	title: "Live Channel",
	imageUrl:
		"https://nng-phinf.pstatic.net/MjAyMzEyMTVfMTgx/MDAxNzAyNjAxMjEyMTYw.Hw6vs76aI0L1zeu4fziwXDE35gidFriwTSgAjq7KWxUg.0V3KaKvctGKcVYa76UiDVTXMjXeUSuUezHX6nGU4y9kg.PNG/123.png",
	providerData: normalizeProviderData(
		{
			channelId: "75cbf189b3bb8f9f687d2aca0d0a382b",
			followerCount: 4612,
			verifiedMark: true,
			channelImageUrl:
				"https://nng-phinf.pstatic.net/MjAyMzEyMTVfMTgx/MDAxNzAyNjAxMjEyMTYw.Hw6vs76aI0L1zeu4fziwXDE35gidFriwTSgAjq7KWxUg.0V3KaKvctGKcVYa76UiDVTXMjXeUSuUezHX6nGU4y9kg.PNG/123.png",
		},
		"chzzk",
	),
});
const youtubeUrl = "https://www.youtube.com/@WarnerBros";
const youtubeMetadata = resolveLinkMetadata(youtubeUrl, {
	title: "Warner Bros.",
	description:
		"Welcome to the official channel for Warner Bros. Subscribe now for all our latest movie trailers, clips and featurettes!",
	imageUrl: "https://i.ytimg.com/vi/XHT9627ZmS0/maxresdefault.jpg",
	providerData: normalizeProviderData(
		{
			subscriberCount: 12900000,
			viewCount: 9219713897,
			channelImageUrl:
				"https://yt3.ggpht.com/yVXKYrUI8hckCQdyUuOWf5ZJk2keT8WO3TV2b8RYk3RKgjz5Rh8v1UsH7Yz2j_hbDQRk32rZ_rM=s800-c-k-c0x00ffffff-no-rj",
			recentVideoThumbnailUrls: [
				"https://i.ytimg.com/vi/XHT9627ZmS0/maxresdefault.jpg",
				"https://i.ytimg.com/vi/2SbbEuoAXOM/maxresdefault.jpg",
				"https://i.ytimg.com/vi/8_ufLqErU_Q/maxresdefault.jpg",
				"https://i.ytimg.com/vi/J1M0prLNy6I/maxresdefault.jpg",
			],
		},
		"youtube",
	),
});
const instagramUrl = "https://www.instagram.com/ememyers";
const instagramRecentPostThumbnailUrls = [
	"https://scontent-ssn1-1.cdninstagram.com/v/t51.82787-15/791043171_18099882482402366_3904567887241062682_n.heic?stp=dst-jpg_e35_s640x640_tt6&_nc_cat=104&ccb=7-5&_nc_sid=18de74&efg=eyJlZmdfdGFnIjoiQ0FST1VTRUxfSVRFTS5iZXN0X2ltYWdlX3VybGdlbi5DMyJ9&_nc_ohc=QcWIyG2fw_EQ7kNvwGEm8U3&_nc_oc=Adrpy731TkS5aZDD1l7YvinGDT1CbBGCNwgpY3KBYo0ObyxTAskrD6etbkr3Xgda_jQ&_nc_zt=23&_nc_ht=scontent-ssn1-1.cdninstagram.com&_nc_gid=S-s6MuaZaRuQIZnud8W6rQ&_nc_ss=7d60f&oh=00_AQP06RzxseqCdBc09MJlzFRJ9Neugf9Jrvub06FJhagdIg&oe=6ACFE31F",
	"https://scontent-ssn1-1.cdninstagram.com/v/t51.82787-15/746021203_18094774991402366_8114843333842119953_n.jpg?stp=dst-jpg_e35_s640x640_tt6&_nc_cat=101&ccb=7-5&_nc_sid=18de74&efg=eyJlZmdfdGFnIjoiQ0FST1VTRUxfSVRFTS5iZXN0X2ltYWdlX3VybGdlbi5DMyJ9&_nc_ohc=XQgGPsNSH6IQ7kNvwFffnff&_nc_oc=AdrTnlOna8CSv9-BwCeCb5xEMYN6eobBCqg0SiUTe8TzkBfvKhn54e9AaSrqGrEIpbU&_nc_zt=23&_nc_ht=scontent-ssn1-1.cdninstagram.com&_nc_gid=S-s6MuaZaRuQIZnud8W6rQ&_nc_ss=7d60f&oh=00_AQOXXblGBDyCoMBdhQq2qoVvBVQlBp0_IYgsQVAcKXAXrg&oe=6ACFF5A9",
	"https://scontent-ssn1-1.cdninstagram.com/v/t51.82787-15/731677120_18093644024402366_1457754746152075134_n.heic?stp=dst-jpg_e35_s640x640_tt6&_nc_cat=106&ccb=7-5&_nc_sid=18de74&efg=eyJlZmdfdGFnIjoiQ0FST1VTRUxfSVRFTS5iZXN0X2ltYWdlX3VybGdlbi5DMyJ9&_nc_ohc=_iPV9TrbUesQ7kNvwGhzHOC&_nc_oc=Adpc9EF2FRocQQ2OATO_ga4fYDAQA0zVnIP015FJ5m7RvQCAPw2x5nEwPtXk6SWsDuY&_nc_zt=23&_nc_ht=scontent-ssn1-1.cdninstagram.com&_nc_gid=S-s6MuaZaRuQIZnud8W6rQ&_nc_ss=7d60f&oh=00_AQOpLBYjNgVwMfST-8heeAp830fXrck_3Cg7do40lAQ-ow&oe=6ACFD5B0",
	"https://scontent-ssn1-1.cdninstagram.com/v/t51.82787-15/730760443_18093073922402366_2721813683733400293_n.heic?stp=dst-jpg_e35_s640x640_tt6&_nc_cat=105&ccb=7-5&_nc_sid=18de74&efg=eyJlZmdfdGFnIjoiRkVFRC5iZXN0X2ltYWdlX3VybGdlbi5DMyJ9&_nc_ohc=c6jb_7os_G4Q7kNvwEnATRH&_nc_oc=AdpjRlo1HgOCnClb8FO5HI2o7OHqBgE2sVUZKNoWOtgwx1qT0p9z_B9zIrEdFSaOtM0&_nc_zt=23&_nc_ht=scontent-ssn1-1.cdninstagram.com&_nc_gid=S-s6MuaZaRuQIZnud8W6rQ&_nc_ss=7d60f&oh=00_AQNxU-3D_bGFccoCAeWlxd8SEx6j05nZrYOOm9C6zffMww&oe=6ACFF513",
];
const spotifyUrl = "https://open.spotify.com/track/1uK4zAdMcBRyinAOArUA5X";
const spotifyMetadata = resolveLinkMetadata(spotifyUrl, {
	title: "Vaundy - Odoriko",
	description: "Vaundy",
	imageUrl:
		"https://image-cdn-fa.spotifycdn.com/image/ab67616d00001e02e0c3a68b9981c2e7b25f9737",
});
const behanceUrl = "https://www.behance.net/Oberhaeuser";
const behanceRecentProjectThumbnailUrls = [
	"https://mir-s3-cdn-cf.behance.net/projects/404/2302a7214595763.Y3JvcCwxNjE2LDEyNjQsMCww.png",
	"https://mir-s3-cdn-cf.behance.net/projects/404/3720e2191679871.Y3JvcCwxNjE2LDEyNjQsMCww.png",
	"https://mir-s3-cdn-cf.behance.net/projects/404/a05b3c161512069.Y3JvcCwxNjE2LDEyNjQsMCww.png",
	"https://mir-s3-cdn-cf.behance.net/projects/404/a0baa1136405689.Y3JvcCwxNjE2LDEyNjQsMCww.png",
];
const behanceMetadata = resolveLinkMetadata(behanceUrl, {
	title: "My works",
	description: "Information and interface design studio based in Hamburg.",
	imageUrl: behanceRecentProjectThumbnailUrls[0],
	providerData: normalizeProviderData(
		{
			followerCount: 128526,
			recentProjectThumbnailUrls: behanceRecentProjectThumbnailUrls,
		},
		"behance",
	),
});

const occupied: Record<BentoBreakpoint, BentoLayoutMap> = {
	wide: {},
	compact: {},
};

function layouts(id: string, preset: PresetName): BentoItem["layouts"] {
	return Object.fromEntries(
		(["wide", "compact"] as const).map((breakpoint) => {
			const layout = placeAtFirstAvailable(
				occupied[breakpoint],
				getPresetGeometry(preset, breakpoint),
				previewColumns[breakpoint],
			);
			occupied[breakpoint][id] = layout;
			return [breakpoint, layout];
		}),
	) as BentoItem["layouts"];
}

function layoutsAt(
	id: string,
	preset: PresetName,
	positions: Record<BentoBreakpoint, { x: number; y: number }>,
): BentoItem["layouts"] {
	return Object.fromEntries(
		(["wide", "compact"] as const).map((breakpoint) => {
			const layout = {
				...getPresetGeometry(preset, breakpoint),
				...positions[breakpoint],
			};
			occupied[breakpoint][id] = layout;
			return [breakpoint, layout];
		}),
	) as BentoItem["layouts"];
}

const demoFeed: RssFeedResponse = {
	source: {
		inputUrl: "https://notes.example.com",
		pageUrl: "https://notes.example.com",
		feedUrl: "https://notes.example.com/feed",
		platform: "substack",
		type: "blog",
		iconUrl: "/api/provider-icons/substack.svg",
		title: "Field Notes",
	},
	items: [
		{
			id: "slow-mornings",
			title: "Making room for slower mornings",
			url: "https://notes.example.com/p/slow-mornings",
			publishedAt: "2026-10-08T00:00:00.000Z",
			updatedAt: null,
			authors: ["Field Notes Team"],
			imageUrl: null,
			tags: ["journal"],
		},
		{
			id: "city-light",
			title: "A city seen in the last light of day",
			url: "https://notes.example.com/p/city-light",
			publishedAt: "2026-10-03T00:00:00.000Z",
			updatedAt: null,
			authors: ["Field Notes Team"],
			imageUrl: null,
			tags: ["photography"],
		},
		{
			id: "small-details",
			title: "The small details that make a place feel like home",
			url: "https://notes.example.com/p/small-details",
			publishedAt: "2026-09-26T00:00:00.000Z",
			updatedAt: null,
			authors: ["Field Notes Team"],
			imageUrl: null,
			tags: ["places"],
		},
	],
};

const items: Array<{
	item: BentoItem;
}> = [
	{
		item: {
			id: "preview-calendly",
			type: "calendly",
			data: {
				eventTypeUri: calendlyDemoEvent.uri,
				schedulingUrl: calendlyDemoEvent.schedulingUrl,
			},
			style: {},
			layouts: layouts("preview-calendly", "squareLarge"),
			createdAt: timestamp,
			updatedAt: timestamp,
			preset: "squareLarge",
		},
	},
	{
		item: {
			id: "preview-map",
			type: "map",
			data: {
				latitude: 21.3069,
				longitude: -157.8583,
				zoom: 12,
				caption: "Honolulu, Hawaii",
			},
			style: {},
			layouts: layouts("preview-map", "landscape"),
			createdAt: timestamp,
			updatedAt: timestamp,
			preset: "landscape",
		},
	},
	{
		item: {
			id: "preview-tweet",
			type: "link",
			data: {
				url: "https://x.com/i/status/2108489034565583266",
				metadata: {
					title: "A note for today",
					provider: "tweet",
					providerData: normalizeProviderData({
						tweet: {
							authorName: "Avery Reed",
							authorProfileUrl: "https://x.com/averyreed",
							authorProfileImageUrl: "/images/test2/avery-reed-avatar.png",
						},
					}),
				},
			},
			style: {},
			layouts: layouts("preview-tweet", "squareLarge"),
			createdAt: timestamp,
			updatedAt: timestamp,
			preset: "squareLarge",
		},
	},
	{
		item: {
			id: "preview-text",
			type: "text",
			data: { text: "Do create your page!" },
			style: { backgroundColor: "#ffffff", textAlign: "left" },
			layouts: layouts("preview-text", "halfBanner"),
			createdAt: timestamp,
			updatedAt: timestamp,
			preset: "halfBanner",
		},
	},
	{
		item: {
			id: "preview-rss",
			type: "link",
			data: {
				url: demoFeed.source.pageUrl,
				metadata: {
					title: "Field Notes",
					provider: "rss-feed",
					rss: demoFeed,
					providerData: normalizeProviderData(
						{
							followerCount: 1840,
							followerCountLabel: "1.8K readers",
						},
						"rss-feed",
					),
					presentation: {
						provider: "substack",
						providerLabel: "Substack",
						actionBackground: "#ff6719",
						actionText: "#ffffff",
						actionLabel: "Read",
						actionDetail: "1.8K readers",
						actionVariant: "solid",
					},
				},
			},
			style: {},
			layouts: layoutsAt("preview-rss", "portrait", {
				wide: { x: 4, y: 4 },
				compact: { x: 4, y: 6 },
			}),
			createdAt: timestamp,
			updatedAt: timestamp,
			preset: "portrait",
		},
	},
	{
		item: {
			id: "preview-twitch",
			type: "link",
			data: {
				url: twitchUrl,
				metadata: twitchMetadata,
			},
			style: {},
			layouts: layouts("preview-twitch", "squareSmall"),
			createdAt: timestamp,
			updatedAt: timestamp,
			preset: "squareSmall",
		},
	},
	{
		item: {
			id: "preview-chzzk",
			type: "link",
			data: {
				url: chzzkUrl,
				metadata: chzzkMetadata,
			},
			style: {},
			layouts: layouts("preview-chzzk", "squareSmall"),
			createdAt: timestamp,
			updatedAt: timestamp,
			preset: "squareSmall",
		},
	},
	{
		item: {
			id: "preview-x",
			type: "link",
			data: {
				url: "https://x.com/elonmusk",
				metadata: {
					title: "Build in public",
					description: "https://t.co/ZdBx5WABYx",
					imageUrl: "https://pbs.twimg.com/profile_banners/44196397/1774145451",
					faviconUrl: "/api/provider-icons/x.svg",
					provider: "x",
					providerData: normalizeProviderData(
						{
							followerCount: 12400,
							followerCountLabel: "12400",
							followerCountApproximate: false,
						},
						"x",
					),
					presentation: {
						provider: "x",
						providerLabel: "X",
						cardBackground: "#f7f7f7",
						imageUrls: [
							"https://pbs.twimg.com/profile_banners/44196397/1774145451",
						],
						actionBackground: "#000000",
						actionText: "#ffffff",
						actionLabel: "Follow",
						actionDetail: "12.4K",
						actionVariant: "solid",
					},
				},
			},
			style: {},
			layouts: layouts("preview-x", "landscape"),
			createdAt: timestamp,
			updatedAt: timestamp,
			preset: "landscape",
		},
	},
	{
		item: {
			id: "preview-youtube",
			type: "link",
			data: {
				url: youtubeUrl,
				metadata: youtubeMetadata,
			},
			style: {},
			layouts: layouts("preview-youtube", "landscape"),
			createdAt: timestamp,
			updatedAt: timestamp,
			preset: "landscape",
		},
	},
	{
		item: {
			id: "preview-instagram",
			type: "link",
			data: {
				url: instagramUrl,
				metadata: {
					title: "My instagram",
					description: "12.4K followers, 318 following, 64 posts",
					imageUrl: instagramRecentPostThumbnailUrls[0],
					faviconUrl: "/api/provider-icons/instagram.svg",
					provider: "instagram",
					providerData: normalizeProviderData(
						{
							followerCount: 12_400,
							followerCountLabel: "12.4K",
							followerCountApproximate: true,
							followingCount: 318,
							mediaCount: 64,
							recentPostThumbnailUrls: instagramRecentPostThumbnailUrls,
						},
						"instagram",
					),
					presentation: {
						provider: "instagram",
						providerLabel: "Instagram",
						cardBackground: "#ffffff",
						actionBackground: "#3797f0",
						actionText: "#ffffff",
						actionLabel: "Follow",
						actionDetail: "12.4K",
						actionVariant: "solid",
						imageUrls: instagramRecentPostThumbnailUrls,
					},
				},
			},
			style: {},
			layouts: layouts("preview-instagram", "portrait"),
			createdAt: timestamp,
			updatedAt: timestamp,
			preset: "portrait",
		},
	},
	{
		item: {
			id: "preview-spotify",
			type: "link",
			data: { url: spotifyUrl, metadata: spotifyMetadata },
			style: {},
			layouts: layouts("preview-spotify", "squareSmall"),
			createdAt: timestamp,
			updatedAt: timestamp,
			preset: "squareSmall",
		},
	},
	{
		item: {
			id: "preview-placeholder-secondary",
			type: "text",
			data: { text: "" },
			style: {},
			layouts: layouts("preview-placeholder-secondary", "squareSmall"),
			createdAt: timestamp,
			updatedAt: timestamp,
			preset: "squareSmall",
		},
	},
	{
		item: {
			id: "preview-placeholder-secondary-40",
			type: "text",
			data: { text: "" },
			style: {},
			layouts: layouts("preview-placeholder-secondary-40", "squareSmall"),
			createdAt: timestamp,
			updatedAt: timestamp,
			preset: "squareSmall",
		},
	},
	{
		item: {
			id: "preview-behance",
			type: "link",
			data: { url: behanceUrl, metadata: behanceMetadata },
			style: {},
			layouts: layouts("preview-behance", "landscape"),
			createdAt: timestamp,
			updatedAt: timestamp,
			preset: "landscape",
		},
	},
];

export default function Test2Page() {
	const [breakpoint, setBreakpoint] = useState<BentoBreakpoint>("compact");
	const [previewItems, setPreviewItems] = useState(() =>
		items.map(({ item }) => item),
	);
	const selectedDate = new Date("2026-10-12T12:00:00.000Z");
	const availability: CalendlyAvailability = {
		loading: false,
		error: false,
		times: calendlyDemoAvailabilityTimes.filter(
			({ startTime }) => startTime >= previewToday.toISOString(),
		),
		displayTimeZone: "Asia/Seoul",
		bookingUrl: calendlyDemoEvent.schedulingUrl,
		selectedDate,
		timespanStart: previewToday,
		timespanEnd: new Date(calendlyDemoDateRange.lastDay),
		canGoToPreviousDay: true,
		canGoToNextDay: true,
		canGoToPreviousMonth: false,
		canGoToNextMonth: true,
		onChangeDay: () => {},
		onChangeMonth: () => {},
	};
	useEffect(() => {
		const mediaQuery = window.matchMedia(bentoWideMediaQuery);
		const syncBreakpoint = () =>
			setBreakpoint(mediaQuery.matches ? "wide" : "compact");
		syncBreakpoint();
		mediaQuery.addEventListener("change", syncBreakpoint);
		return () => mediaQuery.removeEventListener("change", syncBreakpoint);
	}, []);
	const { margin, rowHeight } = bentoGridMetrics[breakpoint];
	const columns = previewColumns[breakpoint];
	const gridWidth = getPreviewWidth(breakpoint);
	const gridHeight =
		previewRows * rowHeight + Math.max(0, previewRows - 1) * margin[1];
	const layout: GridLayout = previewItems.map((item) => ({
		i: item.id,
		...item.layouts[breakpoint],
		isResizable: false,
	}));
	const saveLayout: EventCallback = (nextLayout) => {
		setPreviewItems((current) =>
			current.map((item) => {
				const position = nextLayout.find(({ i }) => i === item.id);
				if (!position) return item;
				return {
					...item,
					layouts: {
						...item.layouts,
						[breakpoint]: {
							x: position.x,
							y: position.y,
							w: position.w,
							h: position.h,
						},
					},
				};
			}),
		);
	};

	return (
		<main className="min-h-svh overflow-x-auto px-6 py-12">
			<div className="relative mx-auto" style={{ width: gridWidth }}>
				<ReactGridLayout
					className="relative z-10"
					width={gridWidth}
					layout={layout}
					gridConfig={{
						cols: columns,
						rowHeight,
						margin,
						containerPadding: [0, 0],
					}}
					dragConfig={{
						enabled: true,
						bounded: false,
						cancel:
							"input, textarea, button, a:not([data-bento-item-card='true']), [role='radio'], [data-bento-item-drag-cancel='true']",
					}}
					resizeConfig={{ enabled: false }}
					compactor={getCompactor(null, false, true)}
					autoSize
					style={{ minHeight: gridHeight }}
					onDragStop={saveLayout}
				>
					{previewItems.map((item) => {
						return (
							<div className="min-h-0 min-w-0" key={item.id}>
								{item.id === "preview-placeholder-secondary" ? (
									<div
										aria-hidden="true"
										className="size-full rounded-3xl border-[3px] border-foreground/8 border-dashed bg-secondary"
									/>
								) : item.id === "preview-placeholder-secondary-40" ? (
									<div
										aria-hidden="true"
										className="size-full rounded-3xl border-[3px] border-foreground/8 border-dashed bg-secondary/40"
									/>
								) : (
									<BentoItemShell
										item={item}
										breakpoint={breakpoint}
										mode="view"
										autoFocus={false}
									>
										{item.id === "preview-calendly" ? (
											<CalendlyWidget
												preset="squareLarge"
												event={calendlyDemoEvent}
												timeZone={{ name: "Asia/Seoul", label: "GMT+9" }}
												availability={availability}
												availabilityView="calendar"
											/>
										) : undefined}
									</BentoItemShell>
								)}
							</div>
						);
					})}
				</ReactGridLayout>
			</div>
		</main>
	);
}
