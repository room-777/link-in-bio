export type LinkTargetMatch = {
	kind: string;
	params: Record<string, string>;
};

function isHostname(url: URL, hostnames: readonly string[]) {
	return hostnames.includes(url.hostname.toLowerCase());
}

function decodeSegment(value: string) {
	try {
		return decodeURIComponent(value);
	} catch {
		return value;
	}
}

export function getXTarget(url: URL): LinkTargetMatch | undefined {
	if (
		!isHostname(url, ["x.com", "www.x.com", "twitter.com", "www.twitter.com"])
	)
		return undefined;
	const handle = url.pathname.match(/^\/([a-z\d_]+)\/?$/i)?.[1];
	return handle ? { kind: "profile", params: { handle } } : undefined;
}

export function getInstagramTarget(url: URL): LinkTargetMatch | undefined {
	const reserved = new Set([
		"accounts",
		"direct",
		"explore",
		"p",
		"reel",
		"reels",
		"stories",
	]);
	if (!isHostname(url, ["instagram.com", "www.instagram.com"]))
		return undefined;
	const handle = url.pathname.match(/^\/([a-z\d._]+)\/?$/i)?.[1];
	return handle && !reserved.has(handle.toLowerCase())
		? { kind: "profile", params: { handle } }
		: undefined;
}

export function getThreadsTarget(url: URL): LinkTargetMatch | undefined {
	if (
		!isHostname(url, [
			"threads.com",
			"www.threads.com",
			"threads.net",
			"www.threads.net",
		])
	)
		return undefined;
	const handle = url.pathname.match(/^\/@([a-z\d._]+)\/?$/i)?.[1];
	return handle ? { kind: "profile", params: { handle } } : undefined;
}

export function getTikTokTarget(url: URL): LinkTargetMatch | undefined {
	if (!isHostname(url, ["tiktok.com", "www.tiktok.com"])) return undefined;
	const handle = url.pathname.match(/^\/@([a-z\d._]+)\/?$/i)?.[1];
	return handle ? { kind: "profile", params: { handle } } : undefined;
}

export function getGithubTarget(url: URL): LinkTargetMatch | undefined {
	if (!isHostname(url, ["github.com", "www.github.com"])) return undefined;
	const username = url.pathname.match(
		/^\/([a-z\d](?:[a-z\d-]{0,38}[a-z\d])?)\/?$/i,
	)?.[1];
	return username ? { kind: "profile", params: { username } } : undefined;
}

export function getYoutubeTarget(url: URL): LinkTargetMatch | undefined {
	if (
		!isHostname(url, [
			"youtube.com",
			"www.youtube.com",
			"m.youtube.com",
			"music.youtube.com",
			"youtu.be",
		])
	)
		return undefined;

	const segments = url.pathname.split("/").filter(Boolean).map(decodeSegment);
	if (url.hostname.toLowerCase() === "youtu.be") {
		return segments[0]
			? { kind: "video", params: { id: segments[0] } }
			: undefined;
	}
	if (segments[0]?.startsWith("@") && segments[0].length > 1) {
		return {
			kind: "channel",
			params: { id: segments[0].slice(1), filter: "forHandle" },
		};
	}
	if (segments[0] === "channel" && segments[1] && segments.length === 2) {
		return { kind: "channel", params: { id: segments[1], filter: "id" } };
	}
	if (segments[0] === "user" && segments[1] && segments.length === 2) {
		return {
			kind: "channel",
			params: { id: segments[1], filter: "forUsername" },
		};
	}
	if (segments[0] === "watch") {
		const id = url.searchParams.get("v");
		return id ? { kind: "video", params: { id } } : undefined;
	}
	if (["shorts", "embed", "live"].includes(segments[0] ?? "") && segments[1]) {
		return { kind: "video", params: { id: segments[1] } };
	}
	return undefined;
}

export function getDiscordTarget(url: URL): LinkTargetMatch | undefined {
	const hostname = url.hostname.toLowerCase();
	const segments = url.pathname.split("/").filter(Boolean);
	if (hostname === "discord.gg" && segments.length === 1) {
		return { kind: "invite", params: { code: segments[0] as string } };
	}
	if (
		["discord.com", "www.discord.com"].includes(hostname) &&
		segments[0] === "invite" &&
		segments[1] &&
		segments.length === 2
	) {
		return { kind: "invite", params: { code: segments[1] } };
	}
	return undefined;
}

export function getChzzkTarget(url: URL): LinkTargetMatch | undefined {
	if (url.hostname.toLowerCase() !== "chzzk.naver.com") return undefined;
	const segments = url.pathname.split("/").filter(Boolean);
	if (segments.length === 1 && /^[a-f\d]{32}$/i.test(segments[0] ?? "")) {
		return { kind: "channel", params: { channelId: segments[0] as string } };
	}
	if (
		["live", "livechat"].includes(segments[0] ?? "") &&
		/^[a-f\d]{32}$/i.test(segments[1] ?? "")
	) {
		return { kind: "live", params: { channelId: segments[1] as string } };
	}
	return undefined;
}

export function getTwitchTarget(url: URL): LinkTargetMatch | undefined {
	if (!isHostname(url, ["twitch.tv", "www.twitch.tv", "m.twitch.tv"]))
		return undefined;
	const segments = url.pathname.split("/").filter(Boolean);
	const reserved = new Set([
		"directory",
		"downloads",
		"jobs",
		"search",
		"settings",
		"subscriptions",
		"turbo",
		"videos",
		"video",
		"clips",
		"login",
		"signup",
	]);
	const login = segments.length === 1 ? segments[0] : undefined;
	return login && !reserved.has(login.toLowerCase())
		? { kind: "profile", params: { login } }
		: undefined;
}

export function getProductHuntTarget(url: URL): LinkTargetMatch | undefined {
	if (!isHostname(url, ["producthunt.com", "www.producthunt.com"]))
		return undefined;
	const slug = url.pathname.match(/^\/products\/([^/]+)\/?$/)?.[1];
	return slug ? { kind: "product", params: { slug } } : undefined;
}
