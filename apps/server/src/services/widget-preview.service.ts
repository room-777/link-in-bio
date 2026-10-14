import {
	tweetPayloadSchema,
	type WidgetPreview,
	type WidgetPreviewRequest,
	type WidgetPreviewResponse,
} from "@grabbin/api";
import { getTweetId, resolveLinkProvider } from "@grabbin/page-link";
import * as v from "valibot";
import {
	enrichLinkProvider,
	type LinkProviderEnvironment,
} from "./link-providers";
import { fetchRssFeed } from "./rss/rss.service";

export type WidgetPreviewErrorCode =
	| "WIDGET_URL_MISMATCH"
	| "SPOTIFY_PREVIEW_UNAVAILABLE"
	| "TWEET_UNAVAILABLE";

export class WidgetPreviewError extends Error {
	constructor(public readonly code: WidgetPreviewErrorCode) {
		super(code);
	}
}

type PreviewContext = { fetch: typeof fetch; env?: LinkProviderEnvironment };

async function previewSpotify(
	url: string,
	{ fetch, env }: PreviewContext,
): Promise<WidgetPreview<"spotify">> {
	const spotifyUrl = new URL(url);
	const resolved = resolveLinkProvider(spotifyUrl);
	if (resolved.id !== "spotify" || !resolved.target)
		throw new WidgetPreviewError("WIDGET_URL_MISMATCH");

	const metadata = await enrichLinkProvider(spotifyUrl, {
		fetch,
		fetchOptional: fetch,
		env,
	});
	const spotify = metadata.providerData?.spotify;
	if (!metadata.title || !spotify)
		throw new WidgetPreviewError("SPOTIFY_PREVIEW_UNAVAILABLE");

	return {
		url: spotifyUrl.toString(),
		title: metadata.title,
		...(metadata.imageUrl ? { imageUrl: metadata.imageUrl } : {}),
		spotify,
	};
}

/** react-tweet's public proxy for the X syndication API. */
const tweetApiOrigin = "https://react-tweet.vercel.app";

async function previewTweet(
	url: string,
	{ fetch }: PreviewContext,
): Promise<WidgetPreview<"tweet">> {
	const tweetId = getTweetId(url);
	if (!tweetId) throw new WidgetPreviewError("WIDGET_URL_MISMATCH");
	const response = await fetch(`${tweetApiOrigin}/api/tweet/${tweetId}`);
	if (!response.ok) throw new WidgetPreviewError("TWEET_UNAVAILABLE");
	const result = v.safeParse(
		v.object({ data: tweetPayloadSchema }),
		await response.json().catch(() => null),
	);
	if (!result.success || result.output.data.id_str !== tweetId)
		throw new WidgetPreviewError("TWEET_UNAVAILABLE");
	return {
		url: `https://x.com/i/status/${tweetId}`,
		tweet: result.output.data,
	};
}

export type WidgetPreviewer = (
	request: WidgetPreviewRequest,
	context: PreviewContext,
) => Promise<WidgetPreviewResponse>;

export const previewWidget: WidgetPreviewer = async (request, context) => {
	switch (request.kind) {
		case "rss":
			return {
				kind: "rss",
				data: {
					url: request.url,
					feed: await fetchRssFeed({ url: request.url, fetch: context.fetch }),
				},
			};
		case "spotify":
			return {
				kind: "spotify",
				data: await previewSpotify(request.url, context),
			};
		case "tweet":
			return { kind: "tweet", data: await previewTweet(request.url, context) };
	}
};
