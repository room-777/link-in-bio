import {
	normalizeProviderData,
	type PageByHandleResponse,
	type PageItemResponse,
} from "@grabbin/api";
import {
	type BentoBreakpoint,
	getColumns,
	getPresetGeometry,
	type PresetName,
	placeAtFirstAvailable,
} from "@grabbin/bento-layout";
import { resolveLinkMetadata } from "@grabbin/page-link";

const contributionColors = [
	"#ebedf0",
	"#9be9a8",
	"#40c463",
	"#30a14e",
	"#216e39",
] as const;
const githubContributionGraph = JSON.stringify({
	weeks: Array.from({ length: 12 }, (_, week) => ({
		days: Array.from({ length: 7 }, (_, day) => {
			const level = (week * 3 + day * 2) % contributionColors.length;
			return {
				color: contributionColors[level],
				count: level,
				level,
			};
		}),
	})),
});

const itemSpecs = [
	{
		id: "about",
		type: "section",
		preset: "fullBanner",
		data: { title: "A little about me" },
	},
	{
		id: "instagram",
		type: "link",
		preset: "landscape",
		data: {
			url: "https://instagram.com/averyreed",
			title: "Daily moments",
			description: "Photos, places, and little things.",
			providerData: normalizeProviderData({ followerCount: 12800 }),
			imageUrl:
				"https://images.unsplash.com/photo-1490750967868-88aa4486c946?auto=format&fit=crop&w=900&q=80",
		},
	},
	{
		id: "youtube",
		type: "link",
		preset: "landscape",
		data: {
			url: "https://youtube.com/@averyreed",
			title: "Avery on YouTube",
			description: "Travel films and photo diaries.",
			providerData: normalizeProviderData({
				subscriberCount: 24800,
				recentVideoThumbnailUrls: [
					"https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=80",
				] as string[],
			}),
		},
	},
	{
		id: "portrait",
		type: "media",
		preset: "landscape",
		data: {
			objectKey: "demo/portrait.jpg",
			mimeType: "image/jpeg",
			mediaUrl:
				"https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?auto=format&fit=crop&w=1200&q=85",
			caption: "A quiet morning in Kyoto",
		},
	},
	{
		id: "note",
		type: "text",
		preset: "landscape",
		data: {
			text: "Collecting small moments, good light, and places worth coming back to.",
		},
	},
	{
		id: "github",
		type: "link",
		preset: "landscape",
		data: {
			url: "https://github.com/averyreed",
			title: "Open source",
			description: "Small tools I make along the way.",
			providerData: normalizeProviderData({
				followers: 1840,
				githubContributionGraph,
			}),
		},
	},
	{
		id: "spotify",
		type: "link",
		preset: "landscape",
		data: {
			url: "https://open.spotify.com/playlist/37i9dQZF1DX4WYpdgoIcn6",
			title: "On repeat",
			description: "The soundtrack for slow mornings.",
			imageUrl:
				"https://images.unsplash.com/photo-1519608487953-e999c86e7455?auto=format&fit=crop&w=900&q=80",
		},
	},
	{
		id: "location",
		type: "map",
		preset: "landscape",
		data: {
			latitude: 35.0116,
			longitude: 135.7681,
			zoom: 12,
			caption: "Currently dreaming of Kyoto",
		},
	},
	{
		id: "now",
		type: "section",
		preset: "fullBanner",
		data: { title: "What I’m into lately" },
	},
	{
		id: "reading",
		type: "text",
		preset: "landscape",
		data: {
			text: "📷 Shooting on film\n☕ Finding neighborhood cafés\n🌿 Taking the scenic route",
		},
	},
	{
		id: "website",
		type: "link",
		preset: "landscape",
		data: {
			url: "https://example.com",
			title: "My journal",
			description: "Longer stories from the road.",
			imageUrl:
				"https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=900&q=80",
		},
	},
	{
		id: "film",
		type: "media",
		preset: "squareLarge",
		data: {
			objectKey: "demo/film.jpg",
			mimeType: "image/jpeg",
			mediaUrl:
				"https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=1000&q=85",
			caption: "Weekend escape",
		},
	},
	{
		id: "github-profile",
		type: "link",
		preset: "landscape",
		data: {
			url: "https://x.com/averyreed",
			title: "Say hello",
			description: "I’m always happy to meet fellow makers.",
			providerData: normalizeProviderData({ followerCount: 6320 }),
			imageUrl:
				"https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=900&q=80",
		},
	},
] as const;

const occupied: Record<
	BentoBreakpoint,
	Record<string, { x: number; y: number; w: number; h: number }>
> = {
	wide: {},
	compact: {},
};

const createdAt = "2026-09-01T00:00:00.000Z";

function createLayouts(id: string, preset: PresetName) {
	return Object.fromEntries(
		(["wide", "compact"] as const).map((breakpoint) => {
			const layout = placeAtFirstAvailable(
				occupied[breakpoint],
				getPresetGeometry(preset, breakpoint),
				getColumns(breakpoint),
			);
			occupied[breakpoint][id] = layout;
			return [breakpoint, layout];
		}),
	) as PageItemResponse["layouts"];
}

const items = itemSpecs.map((spec) => {
	const base = {
		id: spec.id,
		style: {},
		layouts: createLayouts(spec.id, spec.preset),
		createdAt,
		updatedAt: createdAt,
	};

	switch (spec.type) {
		case "section":
			return { ...base, type: spec.type, data: spec.data };
		case "text":
			return { ...base, type: spec.type, data: spec.data };
		case "map":
			return { ...base, type: spec.type, data: spec.data };
		case "media":
			return { ...base, type: spec.type, data: spec.data };
		case "link":
			return {
				...base,
				type: spec.type,
				data: {
					url: spec.data.url,
					metadata: resolveLinkMetadata(spec.data.url, spec.data),
				},
			};
		default:
			throw new Error("Unsupported demo item type.");
	}
}) satisfies PageItemResponse[];

export const DEMO_PAGE_RESPONSE: PageByHandleResponse = {
	page: {
		id: "demo-page",
		handle: "demo",
		imageKey: null,
		imageSource:
			"https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=85",
		imageCrop: null,
		name: "Avery Reed",
		bio: "Designer and photographer collecting good light, memorable places, and ideas worth sharing.",
		isOwner: true,
		canEdit: true,
		hasProAccess: false,
	},
	items,
};
