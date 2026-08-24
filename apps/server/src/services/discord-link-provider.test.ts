import {
	describe,
	expect,
	it,
} from "bun:test";
import { createDiscordEnricher } from "./discord-link-provider";

describe("discord link provider", () => {
	it("extracts invite member counts from the official invite API", async () => {
		const enrich =
			createDiscordEnricher(
				async () => ({
					title: "fallback",
				}),
			);

		const metadata = await enrich(
			new URL(
				"https://discord.gg/discord-developers",
			),
			{
				fetch: async (input) => {
					expect(String(input)).toBe(
						"https://discord.com/api/v10/invites/discord-developers?with_counts=true",
					);
					return new Response(
						JSON.stringify({
							approximate_member_count: 12345,
							approximate_presence_count: 678,
							guild: {
								id: "guild123",
								name: "Discord Developers",
								description:
									"Developer community",
								icon: "a_animated-icon",
							},
							channel: {
								id: "channel123",
								name: "developers",
							},
						}),
						{
							headers: {
								"content-type":
									"application/json",
							},
						},
					);
				},
			},
		);

		expect(metadata).toEqual({
			title: "Discord Developers",
			description:
				"Developer community",
			imageUrl:
				"https://cdn.discordapp.com/icons/guild123/a_animated-icon.gif?size=512",
			providerData: {
				guildId: "guild123",
				channelId: "channel123",
				channelName: "developers",
				memberCount: 12345,
				onlineMemberCount: 678,
				inviteCode:
					"discord-developers",
			},
		});
	});

	it("uses the bot-authorized guild API for Discord channel URLs", async () => {
		const enrich =
			createDiscordEnricher(
				async () => ({
					title: "fallback",
				}),
			);

		const metadata = await enrich(
			new URL(
				"https://discord.com/channels/guild123/channel123",
			),
			{
				env: {
					DISCORD_BOT_TOKEN:
						"bot-token",
				},
				fetch: async (input, init) => {
					const requestUrl = new URL(
						String(input),
					);
					expect(
						init?.headers,
					).toMatchObject({
						Authorization:
							"Bot bot-token",
					});
					if (
						requestUrl.pathname ===
						"/api/v10/channels/channel123"
					) {
						return new Response(
							JSON.stringify({
								id: "channel123",
								guild_id: "guild123",
								name: "general",
								topic: "A channel",
							}),
							{
								headers: {
									"content-type":
										"application/json",
								},
							},
						);
					}

					expect(
						requestUrl.pathname,
					).toBe(
						"/api/v10/guilds/guild123",
					);
					expect(
						requestUrl.searchParams.get(
							"with_counts",
						),
					).toBe("true");
					return new Response(
						JSON.stringify({
							id: "guild123",
							name: "Community",
							description:
								"Guild description",
							icon: "guild-icon",
							approximate_member_count: 321,
							approximate_presence_count: 45,
						}),
						{
							headers: {
								"content-type":
									"application/json",
							},
						},
					);
				},
			},
		);

		expect(metadata).toEqual({
			title: "Community - general",
			description: "A channel",
			imageUrl:
				"https://cdn.discordapp.com/icons/guild123/guild-icon.png?size=512",
			providerData: {
				guildId: "guild123",
				channelId: "channel123",
				channelName: "general",
				memberCount: 321,
				onlineMemberCount: 45,
			},
		});
	});

	it("does not invent an image when Discord has no icon or banner", async () => {
		const enrich =
			createDiscordEnricher(
				async () => ({
					title: "fallback",
				}),
			);

		const metadata = await enrich(
			new URL(
				"https://discord.com/invite/no-icon",
			),
			{
				fetch: async () =>
					new Response(
						JSON.stringify({
							guild: {
								id: "guild123",
								name: "No Icon",
							},
						}),
						{
							headers: {
								"content-type":
									"application/json",
							},
						},
					),
			},
		);

		expect(metadata).toEqual({
			title: "No Icon",
		});
	});
});
