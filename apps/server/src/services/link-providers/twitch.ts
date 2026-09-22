import type { PageItemLinkMetadata } from "@grabbin/api";
import {
	asNumber,
	asRecord,
	asString,
	fetchJson,
	getHttpsUrl,
	getProviderData,
} from "./runtime";
import type { LinkProviderContext, LinkProviderTarget } from "./types";

async function getTwitchAccessToken(context: LinkProviderContext) {
	const userToken = asString(context.env?.TWITCH_USER_ACCESS_TOKEN);
	if (userToken) return userToken;
	const clientId = asString(context.env?.TWITCH_CLIENT_ID);
	const clientSecret = asString(context.env?.TWITCH_CLIENT_SECRET);
	if (!clientId || !clientSecret) return undefined;
	const endpoint = new URL("https://id.twitch.tv/oauth2/token");
	endpoint.searchParams.set("client_id", clientId);
	endpoint.searchParams.set("client_secret", clientSecret);
	endpoint.searchParams.set("grant_type", "client_credentials");
	const payload = asRecord(
		await fetchJson(endpoint, context, { method: "POST" }),
	);
	return asString(payload?.access_token);
}

export async function enrichTwitch(
	_url: URL,
	target: LinkProviderTarget,
	context: LinkProviderContext,
): Promise<Partial<PageItemLinkMetadata>> {
	const login = target.kind === "profile" ? target.params.login : undefined;
	const clientId = asString(context.env?.TWITCH_CLIENT_ID);
	if (!login || !clientId) return {};
	const token = await getTwitchAccessToken(context);
	if (!token) return {};
	const headers = {
		Accept: "application/json",
		"Client-Id": clientId,
		Authorization: `Bearer ${token}`,
	};
	const userPayload = asRecord(
		await fetchJson(
			`https://api.twitch.tv/helix/users?login=${encodeURIComponent(login)}`,
			context,
			{ headers },
		),
	);
	const user = Array.isArray(userPayload?.data)
		? asRecord(userPayload.data[0])
		: undefined;
	const userId = asString(user?.id);
	if (!user || !userId) return {};
	const followersPayload = asRecord(
		await fetchJson(
			"https://api.twitch.tv/helix/channels/followers?broadcaster_id=" +
				encodeURIComponent(userId),
			context,
			{ headers },
		),
	);
	const profileImageUrl = getHttpsUrl(user.profile_image_url);
	return {
		title: asString(user.display_name) ?? login,
		description: asString(user.description),
		imageUrl: profileImageUrl,
		providerData: getProviderData({
			channelId: userId,
			profileImageUrl,
			followerCount: asNumber(followersPayload?.total),
		}),
	};
}
