import type { PageItemLinkMetadata } from "@grabbin/api";
import type { LinkProviderTarget } from "@grabbin/page-link";
import type { AppEnv } from "../../types";

export type { LinkProviderTarget };

export type LinkProviderEnvironment = Partial<
	Pick<
		AppEnv["Bindings"],
		| "YOUTUBE_API_KEY"
		| "DRIBBBLE_ACCESS_TOKEN"
		| "CHZZK_CLIENT_ID"
		| "CHZZK_CLIENT_SECRET"
		| "TWITCH_CLIENT_ID"
		| "TWITCH_CLIENT_SECRET"
		| "TWITCH_USER_ACCESS_TOKEN"
		| "GITHUB_TOKEN"
		| "PRODUCT_HUNT_TOKEN"
	>
>;

export type LinkProviderContext = {
	fetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
	env?: LinkProviderEnvironment;
};

export type LinkProviderEnricher = (
	url: URL,
	target: LinkProviderTarget,
	context: LinkProviderContext,
) => Promise<Partial<PageItemLinkMetadata>>;
