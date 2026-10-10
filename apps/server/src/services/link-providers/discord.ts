import type { PageItemLinkMetadata } from "@grabbin/api";
import {
	asNumber,
	asRecord,
	asString,
	fetchJson,
	getProviderData,
} from "./runtime";
import type { LinkProviderContext, LinkProviderTarget } from "./types";

export async function enrichDiscord(
	_url: URL,
	target: LinkProviderTarget,
	context: LinkProviderContext,
): Promise<Partial<PageItemLinkMetadata>> {
	const code = target.kind === "invite" ? target.params.code : undefined;
	if (!code) return {};
	const payload = asRecord(
		await fetchJson(
			"https://discord.com/api/v10/invites/" +
				encodeURIComponent(code) +
				"?with_counts=true",
			context,
			{
				headers: {
					Accept: "application/json",
					"User-Agent": "Grabbin (https://grabbin.me, 1.0)",
				},
			},
		),
	);
	const guild = asRecord(payload?.guild);
	if (!guild) return {};
	const guildId = asString(guild.id);
	const iconHash = asString(guild.icon);
	const imageUrl =
		guildId && iconHash
			? "https://cdn.discordapp.com/icons/" +
				encodeURIComponent(guildId) +
				"/" +
				encodeURIComponent(iconHash) +
				".png?size=512"
			: undefined;
	return {
		title: asString(guild.name),
		description: asString(guild.description),
		...(imageUrl ? { imageUrl } : {}),
		providerData: getProviderData({
			guildId,
			inviteCode: code,
			memberCount: asNumber(payload?.approximate_member_count),
			onlineMemberCount: asNumber(payload?.approximate_presence_count),
		}),
	};
}
