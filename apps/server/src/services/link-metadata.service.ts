import {
	createInitialLinkMetadata,
	getLinkProviderIconObjectKey,
	type PageItemLinkMetadata,
	type PageItemUpsert,
	pageItemLinkDataSchema,
} from "@grabbin/api";

export {
	createInitialLinkMetadata,
	normalizeLinkUrl,
} from "@grabbin/api";

import { getPublicR2ObjectUrl } from "@core/r2";
import type { DatabaseClient } from "@db/index";
import {
	pageItems,
	providerTokens,
} from "@db/schema";
import { and, eq } from "drizzle-orm";
import * as v from "valibot";
import {
	NotFoundError,
	UnprocessableEntityError,
} from "../exceptions/http-exceptions";
import type {
	TwitchUserToken,
	TwitchUserTokenStore,
} from "./link-providers";
import {
	type LinkProviderEnvironment,
	resolveLinkProvider,
} from "./link-providers";
import { assertOwnedPage } from "./page.service";

export function prepareLinkItem(
	item: Extract<
		PageItemUpsert,
		{ type: "link" }
	>,
	current?: typeof pageItems.$inferSelect,
) {
	const currentData =
		current?.type === "link"
			? v.safeParse(
					pageItemLinkDataSchema,
					current.data,
				)
			: null;
	const sameUrl =
		currentData?.success &&
		currentData.output.url ===
			item.data.url;
	const initialMetadata =
		createInitialLinkMetadata(
			item.data.url,
		);
	const metadata = sameUrl
		? {
				...(currentData.success
					? currentData.output.metadata
					: undefined),
				...item.data.metadata,
			}
		: {
				...item.data.metadata,
				...initialMetadata,
			};

	return {
		...item,
		data: {
			...item.data,
			metadata,
		},
	};
}

function mergeMetadata(
	current:
		| PageItemLinkMetadata
		| undefined,
	enriched: PageItemLinkMetadata,
): PageItemLinkMetadata {
	return Object.fromEntries(
		Object.entries({
			...current,
			...enriched,
		}).filter(
			([, value]) =>
				value !== undefined,
		),
	) as PageItemLinkMetadata;
}

const TWITCH_PROVIDER_ID = "twitch";

function createTwitchUserTokenStore(
	db: DatabaseClient,
): TwitchUserTokenStore {
	return {
		get: async () => {
			const token =
				await db.query.providerTokens.findFirst(
					{
						where: eq(
							providerTokens.provider,
							TWITCH_PROVIDER_ID,
						),
					},
				);
			if (!token) return undefined;
			return {
				accessToken: token.accessToken,
				refreshToken:
					token.refreshToken ??
					undefined,
				expiresAt:
					token.accessTokenExpiresAt?.getTime(),
			};
		},
		set: async (
			token: TwitchUserToken,
		) => {
			const now = new Date();
			await db
				.insert(providerTokens)
				.values({
					provider: TWITCH_PROVIDER_ID,
					accessToken:
						token.accessToken,
					refreshToken:
						token.refreshToken ?? null,
					accessTokenExpiresAt:
						token.expiresAt
							? new Date(
									token.expiresAt,
								)
							: null,
					createdAt: now,
					updatedAt: now,
				})
				.onConflictDoUpdate({
					target:
						providerTokens.provider,
					set: {
						accessToken:
							token.accessToken,
						refreshToken:
							token.refreshToken ??
							null,
						accessTokenExpiresAt:
							token.expiresAt
								? new Date(
										token.expiresAt,
									)
								: null,
						updatedAt: now,
					},
				});
		},
	};
}

export async function enrichPageItemMetadata({
	db,
	handle,
	userId,
	itemId,
	url,
	publicBaseUrl,
	env,
	fetch,
}: {
	db: DatabaseClient;
	handle: string;
	userId: string;
	itemId: string;
	url: string;
	publicBaseUrl?: string;
	env?: LinkProviderEnvironment;
	fetch: (
		input: RequestInfo | URL,
		init?: RequestInit,
	) => Promise<Response>;
}) {
	const page = await assertOwnedPage(
		db,
		handle,
		userId,
	);
	const current =
		await db.query.pageItems.findFirst({
			where: and(
				eq(pageItems.id, itemId),
				eq(pageItems.pageId, page.id),
			),
		});
	if (!current)
		throw new NotFoundError("Item");
	if (current.type !== "link")
		throw new UnprocessableEntityError(
			"Item is not a link.",
			"NOT_LINK_ITEM",
		);

	const currentData = v.parse(
		pageItemLinkDataSchema,
		current.data,
	);
	if (currentData.url !== url)
		throw new UnprocessableEntityError(
			"Link URL changed before metadata completed.",
			"STALE_LINK_METADATA",
		);

	const provider = resolveLinkProvider(
		new URL(url),
	);
	const enriched =
		await provider.enrich(
			new URL(url),
			{
				fetch,
				env,
				...(provider.id ===
				TWITCH_PROVIDER_ID
					? {
							twitchUserTokenStore:
								createTwitchUserTokenStore(
									db,
								),
						}
					: {}),
			},
		);
	const iconObjectKey =
		getLinkProviderIconObjectKey(
			provider.id,
		);
	const providerIconUrl = iconObjectKey
		? getPublicR2ObjectUrl(
				publicBaseUrl,
				iconObjectKey,
			)
		: undefined;
	const data = {
		...currentData,
		metadata: mergeMetadata(
			currentData.metadata,
			{
				...enriched,
				...(providerIconUrl
					? {
							faviconUrl:
								providerIconUrl,
						}
					: undefined),
			},
		),
	};
	data.metadata = mergeMetadata(
		data.metadata,
		{
			provider: provider.id,
		},
	);
	await db
		.update(pageItems)
		.set({
			data,
			updatedAt: new Date(),
		})
		.where(
			and(
				eq(pageItems.id, itemId),
				eq(pageItems.pageId, page.id),
			),
		);

	const updated =
		await db.query.pageItems.findFirst({
			where: and(
				eq(pageItems.id, itemId),
				eq(pageItems.pageId, page.id),
			),
		});
	if (!updated)
		throw new NotFoundError("Item");

	return updated;
}
