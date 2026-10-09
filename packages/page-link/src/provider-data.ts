import type {
	PageItemLinkMetadata,
	PageItemLinkPresentation,
} from "@grabbin/api";
import {
	getBehanceTarget,
	getChzzkTarget,
	getDiscordTarget,
	getDribbbleTarget,
	getGithubTarget,
	getInstagramTarget,
	getPinterestTarget,
	getProductHuntTarget,
	getSoopTarget,
	getThreadsTarget,
	getTikTokTarget,
	getTwitchTarget,
	getXTarget,
	getYoutubeTarget,
	type LinkTargetMatch,
} from "./provider-targets";

export type ProviderTheme = Pick<
	PageItemLinkPresentation,
	| "faviconBackground"
	| "cardBackground"
	| "actionBackground"
	| "actionText"
	| "actionLabel"
	| "actionVariant"
>;

type ProviderData = NonNullable<PageItemLinkMetadata["providerData"]>;

export type LinkProviderTarget = LinkTargetMatch & {
	provider: LinkProviderId;
};

export type LinkProviderPresentationContext = {
	url: string;
	metadata?: PageItemLinkMetadata;
	providerData?: ProviderData;
	target?: LinkProviderTarget;
};

const providerIconUrl = (providerId: string) =>
	`/api/provider-icons/${providerId}.svg`;

export type LinkProviderDefinition = {
	id: string;
	hosts: readonly string[];
	label: string;
	faviconUrl?: string;
	advancedWidget?: {
		badgeProviderIds?: readonly string[];
	};
	theme?: ProviderTheme;
	countKey?: string;
	resolveTarget?: (url: URL) => LinkTargetMatch | undefined;
	getActionDetail?: (
		providerData: ProviderData | undefined,
	) => string | undefined;
	getImageUrls?: (context: LinkProviderPresentationContext) => string[];
	present?: (
		context: LinkProviderPresentationContext,
	) => Partial<PageItemLinkPresentation>;
};

const youtubeTheme: ProviderTheme = {
	faviconBackground: "#FF0033",
	cardBackground: "#fff2f5",
	actionBackground: "#ff0033",
	actionText: "#ffffff",
	actionLabel: "Watch",
	actionVariant: "solid",
};

const youtubeMusicTheme: ProviderTheme = {
	...youtubeTheme,
	actionLabel: "Listen",
};

const youtubeImageUrls = ({
	metadata,
	providerData,
}: LinkProviderPresentationContext) => {
	const recentVideoThumbnailUrls = Array.isArray(
		providerData?.recentVideoThumbnailUrls,
	)
		? providerData.recentVideoThumbnailUrls.filter(
				(value): value is string =>
					typeof value === "string" && value.startsWith("https://"),
			)
		: [];
	if (recentVideoThumbnailUrls.length > 0) return recentVideoThumbnailUrls;

	const channelImageUrl =
		typeof providerData?.channelImageUrl === "string" &&
		providerData.channelImageUrl.startsWith("https://")
			? [providerData.channelImageUrl]
			: [];
	if (channelImageUrl.length > 0) return channelImageUrl;
	return typeof metadata?.imageUrl === "string" ? [metadata.imageUrl] : [];
};

const instagramImageUrls = ({
	metadata,
	providerData,
}: LinkProviderPresentationContext) => {
	const recentPostThumbnailUrls = Array.isArray(
		providerData?.recentPostThumbnailUrls,
	)
		? providerData.recentPostThumbnailUrls.filter(
				(value): value is string =>
					typeof value === "string" && value.startsWith("https://"),
			)
		: [];
	return recentPostThumbnailUrls.length > 0
		? recentPostThumbnailUrls
		: typeof metadata?.imageUrl === "string"
			? [metadata.imageUrl]
			: [];
};

const behanceImageUrls = ({
	metadata,
	providerData,
}: LinkProviderPresentationContext) => {
	const recentProjectThumbnailUrls = Array.isArray(
		providerData?.recentProjectThumbnailUrls,
	)
		? providerData.recentProjectThumbnailUrls.filter(
				(value): value is string =>
					typeof value === "string" && value.startsWith("https://"),
			)
		: [];
	return recentProjectThumbnailUrls.length > 0
		? recentProjectThumbnailUrls
		: typeof metadata?.imageUrl === "string"
			? [metadata.imageUrl]
			: [];
};

const dribbbleImageUrls = ({
	metadata,
	providerData,
}: LinkProviderPresentationContext) => {
	const recentShotThumbnailUrls = Array.isArray(
		providerData?.recentShotThumbnailUrls,
	)
		? providerData.recentShotThumbnailUrls.filter(
				(value): value is string =>
					typeof value === "string" && value.startsWith("https://"),
			)
		: [];
	return recentShotThumbnailUrls.length > 0
		? recentShotThumbnailUrls
		: typeof metadata?.imageUrl === "string"
			? [metadata.imageUrl]
			: [];
};

export const providerDefinitions = [
	{
		id: "youtube",
		hosts: ["youtube.com", "youtu.be"],
		label: "YouTube",
		faviconUrl: providerIconUrl("youtube"),
		theme: youtubeTheme,
		countKey: "subscriberCount",
		resolveTarget: getYoutubeTarget,
		getImageUrls: youtubeImageUrls,
	},
	{
		id: "youtube-music",
		hosts: ["music.youtube.com"],
		label: "YouTube Music",
		faviconUrl: providerIconUrl("youtube-music"),
		theme: youtubeMusicTheme,
		resolveTarget: getYoutubeTarget,
	},
	{
		id: "discord",
		hosts: ["discord.com", "discord.gg"],
		label: "Discord",
		faviconUrl: providerIconUrl("discord"),
		theme: {
			faviconBackground: "#5865F2",
			cardBackground: "#f2f3ff",
			actionBackground: "#5865f2",
			actionText: "#ffffff",
			actionLabel: "Join",
			actionVariant: "solid",
		},
		countKey: "memberCount",
		resolveTarget: getDiscordTarget,
	},
	{
		id: "github",
		hosts: ["github.com"],
		label: "GitHub",
		faviconUrl: providerIconUrl("github"),
		theme: {
			faviconBackground: "#181717",
			cardBackground: "#ffffff",
			actionBackground: "#f6f8fa",
			actionText: "#000000",
			actionLabel: "Follow",
			actionVariant: "outline",
		},
		countKey: "followers",
		resolveTarget: getGithubTarget,
		present: ({ providerData }) =>
			typeof providerData?.githubContributionGraph === "string" &&
			providerData.githubContributionGraph.trim()
				? { githubContributionGraph: providerData.githubContributionGraph }
				: {},
	},
	{
		id: "facebook",
		hosts: ["facebook.com"],
		label: "Facebook",
		faviconUrl: providerIconUrl("facebook"),
		theme: { faviconBackground: "#1877F2" },
	},
	{
		id: "x",
		hosts: ["twitter.com", "x.com"],
		label: "X",
		faviconUrl: providerIconUrl("x"),
		theme: {
			faviconBackground: "#000000",
			cardBackground: "#f7f7f7",
			actionBackground: "#000000",
			actionText: "#ffffff",
			actionLabel: "Follow",
			actionVariant: "solid",
		},
		countKey: "followerCount",
		resolveTarget: getXTarget,
	},
	{
		id: "spotify",
		hosts: ["spotify.com"],
		label: "Spotify",
		faviconUrl: providerIconUrl("spotify"),
		theme: {
			faviconBackground: "#1ED760",
			cardBackground: "#f0fbf4",
			actionBackground: "#1ED760",
			actionText: "#ffffff",
			actionLabel: "Play",
			actionVariant: "solid",
		},
	},
	{
		id: "app-store",
		hosts: ["apps.apple.com", "itunes.apple.com"],
		label: "App Store",
		faviconUrl: providerIconUrl("app-store"),
		theme: {
			faviconBackground: "#2072F3",
			cardBackground: "#EAF4FF",
			actionBackground: "#007AFF",
			actionText: "#FFFFFF",
			actionLabel: "Download",
			actionVariant: "solid",
		},
	},
	{
		id: "google-play",
		hosts: ["play.google.com"],
		label: "Google Play",
		faviconUrl: providerIconUrl("google-play"),
		theme: {
			faviconBackground: "#01875F",
			cardBackground: "#FFFFFF",
			actionBackground: "#F6F8FA",
			actionText: "#000000",
			actionLabel: "Get it",
			actionVariant: "outline",
		},
	},
	{
		id: "threads",
		hosts: ["threads.net", "threads.com"],
		label: "Threads",
		faviconUrl: providerIconUrl("threads"),
		theme: {
			faviconBackground: "#000000",
			cardBackground: "#ffffff",
			actionBackground: "#000000",
			actionText: "#ffffff",
			actionLabel: "Follow",
			actionVariant: "solid",
		},
		countKey: "followerCount",
		getActionDetail: (providerData) =>
			typeof providerData?.followerCountLabel === "string" &&
			providerData.followerCountLabel.trim()
				? providerData.followerCountLabel.trim()
				: undefined,
		resolveTarget: getThreadsTarget,
	},
	{
		id: "instagram",
		hosts: ["instagram.com"],
		label: "Instagram",
		faviconUrl: providerIconUrl("instagram"),
		theme: {
			faviconBackground: "#FF005F",
			cardBackground: "#ffffff",
			actionBackground: "#3797f0",
			actionText: "#ffffff",
			actionLabel: "Follow",
			actionVariant: "solid",
		},
		countKey: "followerCount",
		resolveTarget: getInstagramTarget,
		getImageUrls: instagramImageUrls,
	},
	{
		id: "buy-me-a-coffee",
		hosts: ["buymeacoffee.com"],
		label: "Buy Me a Coffee",
		faviconUrl: providerIconUrl("buy-me-a-coffee"),
		theme: {
			faviconBackground: "#FFDD00",
			cardBackground: "#fffbe5",
			actionBackground: "#ffdd00",
			actionText: "#000000",
			actionLabel: "Support",
			actionVariant: "solid",
		},
	},
	{
		id: "linkedin",
		hosts: ["linkedin.com"],
		label: "LinkedIn",
		faviconUrl: providerIconUrl("linkedin"),
		theme: {
			faviconBackground: "#0A66C2",
			cardBackground: "#f0f7ff",
			actionBackground: "#0a66c2",
			actionText: "#ffffff",
			actionLabel: "Connect",
			actionVariant: "solid",
		},
	},
	{
		id: "chzzk",
		hosts: ["chzzk.naver.com"],
		label: "CHZZK",
		faviconUrl: providerIconUrl("chzzk"),
		theme: {
			faviconBackground: "#00FFA3",
			cardBackground: "#ffffff",
			actionBackground: "#000000",
			actionText: "#ffffff",
			actionLabel: "Watch",
			actionVariant: "solid",
		},
		countKey: "followerCount",
		resolveTarget: getChzzkTarget,
	},
	{
		id: "soop",
		hosts: ["sooplive.com"],
		label: "SOOP",
		faviconUrl: "https://res.sooplive.com/favicon.ico",
		theme: {
			faviconBackground: "#1C44AB",
			cardBackground: "#F4F6FB",
			actionBackground: "#1C44AB",
			actionText: "#ffffff",
			actionLabel: "Watch",
			actionVariant: "solid",
		},
		countKey: "favoriteCount",
		resolveTarget: getSoopTarget,
	},
	{
		id: "figma",
		hosts: ["figma.com"],
		label: "Figma",
		faviconUrl: providerIconUrl("figma"),
		theme: {
			faviconBackground: "#9747FF",
			cardBackground: "#ffffff",
			actionBackground: "#1769ff",
			actionText: "#ffffff",
			actionLabel: "Open",
			actionVariant: "solid",
		},
	},
	{
		id: "ko-fi",
		hosts: ["ko-fi.com"],
		label: "Ko-fi",
		faviconUrl: providerIconUrl("ko-fi"),
		theme: {
			faviconBackground: "#C19BFF",
			cardBackground: "#eefaff",
			actionBackground: "#29abe0",
			actionText: "#ffffff",
			actionLabel: "Support",
			actionVariant: "solid",
		},
	},
	{
		id: "gumroad",
		hosts: ["gumroad.com"],
		label: "Gumroad",
		faviconUrl: providerIconUrl("gumroad"),
		theme: {
			faviconBackground: "#FF90E8",
			cardBackground: "#fff2fc",
			actionBackground: "#ff90e8",
			actionText: "#000000",
			actionLabel: "Get it",
			actionVariant: "solid",
		},
	},
	{
		id: "medium",
		hosts: ["medium.com"],
		label: "Medium",
		faviconUrl: providerIconUrl("medium"),
		theme: {
			faviconBackground: "#000000",
			cardBackground: "#ffffff",
			actionBackground: "#000000",
			actionText: "#ffffff",
			actionLabel: "Read",
			actionVariant: "solid",
		},
	},
	{
		id: "substack",
		hosts: ["substack.com"],
		label: "Substack",
		faviconUrl: providerIconUrl("substack"),
	},
	{
		id: "note",
		hosts: ["note.com"],
		label: "note",
		faviconUrl: providerIconUrl("note"),
	},
	{
		id: "ghost",
		hosts: ["ghost.io"],
		label: "Ghost",
		faviconUrl: "/api/provider-icons/ghost.webp",
	},
	{
		id: "hashnode",
		hosts: ["hashnode.dev"],
		label: "Hashnode",
		faviconUrl: providerIconUrl("hashnode"),
	},
	{
		id: "patreon",
		hosts: ["patreon.com"],
		label: "Patreon",
		faviconUrl: providerIconUrl("patreon"),
		theme: {
			faviconBackground: "#71A0FF",
			cardBackground: "#ffffff",
			actionBackground: "#71a0ff",
			actionText: "#ffffff",
			actionLabel: "Join",
			actionVariant: "solid",
		},
	},
	{
		id: "product-hunt",
		hosts: ["producthunt.com"],
		label: "Product Hunt",
		faviconUrl: providerIconUrl("product-hunt"),
		theme: {
			faviconBackground: "#FF6154",
			cardBackground: "#fff4f0",
			actionBackground: "#da552f",
			actionText: "#ffffff",
			actionLabel: "View",
			actionVariant: "solid",
		},
		countKey: "upvoteCount",
		resolveTarget: getProductHuntTarget,
		present: ({ providerData }) => {
			const count = providerData?.upvoteCount;
			const number =
				typeof count === "number"
					? count
					: typeof count === "string"
						? Number(count)
						: Number.NaN;
			return Number.isFinite(number)
				? { actionIcon: "upvote", actionLabel: "Upvote" }
				: {};
		},
	},
	{
		id: "reddit",
		hosts: ["reddit.com"],
		label: "Reddit",
		faviconUrl: providerIconUrl("reddit"),
		theme: {
			faviconBackground: "#FF4500",
			cardBackground: "#fff2ed",
			actionBackground: "#ff4500",
			actionText: "#ffffff",
			actionLabel: "Join",
			actionVariant: "solid",
		},
	},
	{
		id: "tiktok",
		hosts: ["tiktok.com"],
		label: "TikTok",
		faviconUrl: providerIconUrl("tiktok"),
		theme: {
			faviconBackground: "#000000",
			cardBackground: "#ffffff",
			actionBackground: "#000000",
			actionText: "#ffffff",
			actionLabel: "Watch",
			actionVariant: "solid",
		},
		countKey: "followerCount",
		resolveTarget: getTikTokTarget,
	},
	{
		id: "twitch",
		hosts: ["twitch.tv"],
		label: "Twitch",
		faviconUrl: providerIconUrl("twitch"),
		theme: {
			faviconBackground: "#9147FF",
			cardBackground: "#f7f2ff",
			actionBackground: "#9146ff",
			actionText: "#ffffff",
			actionLabel: "Watch",
			actionVariant: "solid",
		},
		countKey: "followerCount",
		resolveTarget: getTwitchTarget,
	},
	{
		id: "behance",
		hosts: ["behance.net"],
		label: "Behance",
		faviconUrl: providerIconUrl("behance"),
		countKey: "followerCount",
		resolveTarget: getBehanceTarget,
		getImageUrls: behanceImageUrls,
		present: ({ target }) =>
			target?.kind === "project" ? { actionLabel: "View" } : {},
		theme: {
			actionBackground: "#1769ff",
			actionText: "#ffffff",
			actionLabel: "Follow",
			actionVariant: "solid",
		},
	},
	{
		id: "pinterest",
		hosts: ["pinterest.com", "pin.it"],
		label: "Pinterest",
		faviconUrl: "/api/provider-icons/pinterest.svg",
		countKey: "followerCount",
		resolveTarget: getPinterestTarget,
		present: ({ target }) =>
			target?.kind === "profile"
				? { actionLabel: "Follow" }
				: target?.kind === "board" || target?.kind === "pin"
					? { actionLabel: "View" }
					: {},
		theme: {
			faviconBackground: "#E60023",
			actionBackground: "#E60023",
			actionText: "#ffffff",
			actionLabel: "Open",
			actionVariant: "solid",
		},
		getImageUrls: ({ target, providerData }) =>
			target?.kind === "board" &&
			Array.isArray(providerData?.recentBoardThumbnailUrls)
				? providerData.recentBoardThumbnailUrls.filter(
						(value): value is string => typeof value === "string",
					)
				: [],
	},
	{
		id: "dribbble",
		hosts: ["dribbble.com"],
		label: "Dribbble",
		faviconUrl: providerIconUrl("dribbble"),
		resolveTarget: getDribbbleTarget,
		getImageUrls: dribbbleImageUrls,
		present: ({ target, providerData }) => {
			if (target?.kind === "shot") return { actionLabel: "View" };
			if (target?.kind !== "profile") return {};
			const countLabel =
				typeof providerData?.likeCountLabel === "string"
					? providerData.likeCountLabel
					: typeof providerData?.likeCount === "number"
						? new Intl.NumberFormat("en-US").format(providerData.likeCount)
						: undefined;
			return {
				actionIcon: "like2",
				actionLabel: countLabel ? `${countLabel} Likes` : "Likes",
			};
		},
		theme: {
			faviconBackground: "#EA4C89",
			cardBackground: "#fff2f7",
			actionBackground: "#ea4c89",
			actionText: "#ffffff",
			actionLabel: "Follow",
			actionVariant: "solid",
		},
	},
	{
		id: "calendly",
		hosts: ["calendly.com"],
		label: "Calendly",
		faviconUrl: providerIconUrl("calendly"),
		advancedWidget: { badgeProviderIds: [] },
		theme: {
			faviconBackground: "#006BFF",
		},
	},
	{
		id: "rss-feed",
		hosts: [],
		label: "RSS Feed",
		faviconUrl: providerIconUrl("rss-feed"),
		advancedWidget: {
			badgeProviderIds: ["medium", "substack", "hashnode", "note", "ghost"],
		},
	},
	{
		id: "notion",
		hosts: ["notion.so"],
		label: "Notion",
		faviconUrl: providerIconUrl("notion"),
		theme: {
			faviconBackground: "#000000",
		},
	},
] as const satisfies readonly LinkProviderDefinition[];

export type LinkProviderId =
	| (typeof providerDefinitions)[number]["id"]
	| "generic-web";

export const providerDefinitionList: readonly LinkProviderDefinition[] =
	providerDefinitions;

export type ResolvedLinkProvider = {
	id: LinkProviderId;
	definition?: LinkProviderDefinition;
	target?: LinkProviderTarget;
};

export function resolveLinkProvider(url: URL): ResolvedLinkProvider {
	const hostname = url.hostname.toLowerCase();
	const definition = providerDefinitionList
		.map((candidate) => ({
			candidate,
			matchLength: Math.max(
				...candidate.hosts
					.filter(
						(domain) => hostname === domain || hostname.endsWith(`.${domain}`),
					)
					.map((domain) => domain.length),
				-1,
			),
		}))
		.filter(({ matchLength }) => matchLength >= 0)
		.sort((left, right) => right.matchLength - left.matchLength)[0]?.candidate;
	if (!definition) return { id: "generic-web" };

	const providerId = definition.id as LinkProviderId;
	const targetMatch = definition.resolveTarget?.(url);
	return {
		id: providerId,
		definition,
		target: targetMatch
			? { ...targetMatch, provider: providerId }
			: definition.resolveTarget
				? undefined
				: { kind: "page", params: {}, provider: providerId },
	};
}

export const providerByHostname: Array<[string, string]> = (
	providerDefinitionList.flatMap(({ id, hosts }) =>
		hosts.map((host) => [host, id]),
	) as Array<[string, string]>
).sort((left, right) => right[0].length - left[0].length);

export const providerLabels: Record<string, string> = Object.fromEntries(
	providerDefinitionList.map(({ id, label }) => [id, label]),
);

export const providerTheme: Record<string, ProviderTheme> = Object.fromEntries(
	providerDefinitionList.flatMap(({ id, theme }) =>
		theme ? [[id, theme]] : [],
	),
);

export const providerCountKeys: Record<string, string> = Object.fromEntries(
	providerDefinitionList.flatMap(({ id, countKey }) =>
		countKey ? [[id, countKey]] : [],
	),
);
