import type { LinkProviderId } from "@grabbin/page-link";
import { enrichBehance } from "./behance";
import { enrichChzzk } from "./chzzk";
import { enrichDiscord } from "./discord";
import { enrichDribbble } from "./dribbble";
import { enrichGithub } from "./github";
import { enrichInstagram } from "./instagram";
import { enrichPinterest } from "./pinterest";
import { enrichProductHunt } from "./product-hunt";
import { enrichSoop } from "./soop";
import { enrichThreads } from "./threads";
import { enrichTikTok } from "./tiktok";
import { enrichTwitch } from "./twitch";
import type { LinkProviderEnricher } from "./types";
import { enrichX } from "./x";
import { enrichYoutube } from "./youtube";

const providerEnrichers: Partial<Record<LinkProviderId, LinkProviderEnricher>> =
	{
		x: enrichX,
		instagram: enrichInstagram,
		threads: enrichThreads,
		tiktok: enrichTikTok,
		github: enrichGithub,
		youtube: enrichYoutube,
		"youtube-music": enrichYoutube,
		discord: enrichDiscord,
		chzzk: enrichChzzk,
		soop: enrichSoop,
		twitch: enrichTwitch,
		"product-hunt": enrichProductHunt,
		pinterest: enrichPinterest,
		behance: enrichBehance,
		dribbble: enrichDribbble,
	};

export function getProviderEnricher(
	provider: LinkProviderId,
): LinkProviderEnricher | undefined {
	return providerEnrichers[provider];
}
